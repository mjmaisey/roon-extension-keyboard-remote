// Copyright 2017 Martin Maisey
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const RoonApi          = require("node-roon-api"),
      RoonApiSettings  = require('node-roon-api-settings'),
      RoonApiStatus    = require('node-roon-api-status'),
      RoonApiTransport = require('node-roon-api-transport'),
      os = require("os");

// Roon zone bindings
var roon_api = undefined;
var core = undefined;
var transport = undefined;
var svc_settings = undefined;
var svc_status = undefined;

// Key bindings and zone control settings, stored in and retrieved from Roon
var keyboard_remote_settings = null;

// Config layout
var config_layout = undefined;

// Roon API wrapper.
// Constructor takes a static config layout, default settings (if none are saved), and a 
// callback method to be called when we pair/unpair from a call or settings are saved.
function Roon(config_layout_, update_state, default_settings) {

  // Initialise the Roon API, providing a callback methods for when we pair and unpair with
  // the Roon core
  roon_api = new RoonApi({
    extension_id:        'uk.co.maisey.keyboard-remote:' + os.hostname().split('.')[0],
    display_name:        'Keyboard Remote (' + os.hostname().split('.')[0] + ')',
    display_version:     '0.1.0',
    publisher:           'Martin Maisey',
    email:               'keyboard-remote@maisey.co.uk',
    website:             'https://github.com/mjmaisey/roon-extension-keyboard-remote',
    log_level:           'none',

    core_paired: function(core_) {
        core = core_;
        transport = core.services.RoonApiTransport;
        update_state();
    },

    core_unpaired: function(core_) {
        core = undefined;
        transport = undefined;
        update_state();
    }
  });

  // Load our configuration, or default and save it if not already present
  keyboard_remote_settings = roon_api.load_config("keyboard-remote-settings");
  if (keyboard_remote_settings == null) {
    keyboard_remote_settings = default_settings;
    roon_api.save_config("keyboard-remote-settings", keyboard_remote_settings);  
  }

  // Initialise the settings service that we provide to Roon
  config_layout = config_layout_;
  svc_settings = new RoonApiSettings(roon_api, {
    get_settings: function(cb) {
        let l = {
            values:    keyboard_remote_settings,
            layout:    config_layout,
            has_error: false
        };

        cb(l);
    },
    save_settings: function(req, isdryrun, settings) {
        let l = {
            values:    settings.values,
            layout:    config_layout,
            has_error: false
        };

        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun) {
            keyboard_remote_settings = l.values;
            svc_settings.update_settings(l);
            roon_api.save_config("keyboard-remote-settings", l.values);
            update_state();
        }

    }
  });

  // Initialise status service
  svc_status = new RoonApiStatus(roon_api)

  // Declare our required and provided services
  roon_api.init_services({
      required_services:   [ RoonApiTransport ],
      provided_services:   [ svc_settings, svc_status ]
  });

  // Allow Roon to start recovery
  roon_api.start_discovery();
}

// Retrieve a named setting
Roon.prototype.get_setting = function(setting) {
  return keyboard_remote_settings[setting];
}

// Set a named setting and persist it within Roon
Roon.prototype.set_setting = function(setting, value) {
  keyboard_remote_settings[setting] = value;
  roon_api.save_config("keyboard-remote-settings", keyboard_remote_settings);  
}

// Update the status text in the Roon UI
Roon.prototype.set_status_text = function(status_text) {
  svc_status.set_status(status_text, false);
}

// Check whether we're paired with a Roon core and its transport.
Roon.prototype.is_paired = function() {
  return core && transport;
}

// Take a Roon transport control action. Requires the controlled_zone config item to have
// been set (this should be configured as a Zone field in the provided layout).
//
// Valid action names are at documented in the control() method at
// https://roonlabs.github.io/node-roon-api/RoonApiTransport.html. At time of writing one of:
//    "play", "pause", "playpause", "stop", "previous", "next"
Roon.prototype.control_transport = function(action) {
  transport.control(keyboard_remote_settings["controlled_zone"].output_id, action);
}


exports = module.exports = Roon;
