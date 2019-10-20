const state = {
  page: "landing-page",
  login: null,
  apiKey: null,
  activeBooking: null,
  events: null
};

const host = "http://server.chaletsavoyarde.com:3232";

async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return await response.json(); // parses JSON response into native JavaScript objects
}

async function deleteBooking(id) {
  try {
    const res = await fetch(host + "/bookings/" + id, {
      method: "DELETE"
    });
  
    getBookings()

    return res;
  } catch (error) {
    console.error(error);
  }
}

logins = {
  "4707a6466bd501eec7a64e790ba71f747d7c660d4784f402ae41e4a4927c5a03": "Rob",
  be831db56b1ebbb7259fbb3f2fe26672aed4ca2661730321b0893e50aee64182: "Sam"
};

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [
    this.getFullYear(),
    "-",
    (mm > 9 ? "" : "0") + mm,
    "-",
    (dd > 9 ? "" : "0") + dd
  ].join("");
};

async function getBookings() {
  return fetch(host + "/bookings")
    .then(result => result.json())
    .then(result => {
      if (result.data) {
        return result.data.map(r => ({
          startDate: new Date(r.attributes.startDate),
          endDate: new Date(r.attributes.endDate),
          name: r.attributes.owner,
          details: r.attributes.description,
          id: r.id,
          upcoming: new Date() < new Date(r.attributes.startDate)
        }));
      }

      return [];
    })
    .then(result => {
      state.events = result;
    });
}

async function addBooking(startDate, endDate, description) {

  if (startDate instanceof Date) {
    startDate = startDate.yyyymmdd()
  }

  if (endDate instanceof Date) {
    endDate = endDate.yyyymmdd()
  }

  data = {
    data: {
      attributes: {
        owner: state.login,
        startDate,
        endDate,
        description
      }
    }
  };
  try {
    const res = await postData(host + "/bookings", data);

    // Refresh the data
    // TODO: Don't be lazy, do this locally
  
    getBookings()

    return res;
  } catch (error) {
    console.error(error);
  }
}

// Allows password entry

Vue.component("landing-page", {
  template: "#landingPage",
  data: function() {
    return {
      errors: [],
      state
    };
  },
  mounted: function() {
    var input = document.getElementById("password");

    input.addEventListener("keyup", event => {
      // Number 13 is the "Enter" key on the keyboard
      if (event.keyCode === 13) {
        event.preventDefault();

        // Use SHA256 to determine the user
        // Passwords must thus be unique
        login = CryptoJS.SHA256(input.value).toString();

        if (login in logins) {
          state.page = "booking-page";
          state.login = logins[login];

          // User the name twice as the API key
          password = input.value + input.value;
          this.state.apiKey = CryptoJS.SHA256(password).toString();

          console.log("Using API Key: " + this.state.apiKey);
        } else {
          input.value = "";
          this.errors = [
            {
              type: "Error",
              color: "#990000",
              message: "Password is not valid."
            }
          ];
        }
      }
    });
  }
});

Vue.component("booking-page", {
  template: "#bookingPage",
  data: function() {
    return {
      state,
      accordion: null,
      tooltip: null,
      show: false,
      currentId: null,
      currentStartDate: null,
      currentEndDate: null,
      currentName: null,
      currentDescription: null,
      contextMenuItems: [
        {
          text: "Update",
          click: evt => {
            this.currentId = evt.id;
            this.currentStartDate = evt.startDate;
            this.currentEndDate = evt.endDate;
            this.currentName = evt.name;
            this.currentDescription = evt.details;
            this.show = true;
          }
        },
        {
          text: "Delete",
          click: evt => {
            alert("Not yet implemented");
          }
        }
      ]
    };
  },
  methods: {
    publish: function(e) {
      let startDate = document.getElementById("startDate").value
      let endDate = document.getElementById("endDate").value
      let description = document.getElementById("description").value

      if (!startDate || !endDate || !description) {
        alert("Please ensure all values are filled before submitting.")
      } else {
        addBooking(startDate, endDate, description)
      }      
    },
    trash: function(e) {
        confirmed = confirm("Are you sure you wish to delete this booking?")
        if (confirmed) {
          let target = e.target.parentElement.parentElement.getAttribute("data-id")
          deleteBooking(target)
        }
    },
    clickDay: function(e) {
        if (e.events.length > 0) {
            this.state.activeBooking = e.events[0].id
        }
    },
    edit: function(e) {
      alert("Not yet implemented")
    },
    mouseOnDay: function(e) {
      if (e.events.length > 0) {
        var content = "";

        for (var i in e.events) {
          content +=
            '<div class="event-tooltip-content">' +
            '<div class="event-name" style="color:' +
            e.events[i].color +
            '">' +
            e.events[i].name +
            "</div>" +
            '<div class="event-details">' +
            e.events[i].details +
            "</div>" +
            "</div><hr />";
        }

        if (this.tooltip != null) {
          this.tooltip.destroy();
          this.tooltip = null;
        }

        this.tooltip = tippy(e.element, {
          placement: "right",
          content: content,
          animateFill: false,
          animation: "shift-away",
          arrow: true
        });
        this.tooltip.show();
      }
    },
    mouseOutDay: function() {
      if (this.tooltip !== null) {
        this.tooltip.destroy();
        this.tooltip = null;
      }
    }
  },
  mounted: function() {
    this.accordion = new Accordion({
      element: "accordion", // ID of the accordion container
      oneOpen: true // [optional] Allow one accordion tab only to be opened at a time
    });

    getBookings();
  },
  watch: {
    "state.activeBooking": function (newEvent, oldEvent) {
      try {
        let el = document.getElementsByClassName("event-" + newEvent)[0]
        let target = el.getAttribute("data-index")
        this.accordion.open(target)
      } catch (e) {

      }
        
    }
  },
  computed: {
    upcomingEvents: function() {
      if (!state.events) {
        return []
      }
      return state.events.filter(function(event) {
        return event.upcoming
      })
    }
  }
});

Vue.component("VueSimpleNotify", VueSimpleNotify.VueSimpleNotify);
Vue.component("Calendar", Calendar);

var app = new Vue({
  el: "#app",
  data() {
    return state;
  }
});
