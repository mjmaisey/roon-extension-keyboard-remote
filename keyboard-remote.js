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

var RoonApi          = require("node-roon-api"),
    RoonApiSettings  = require('node-roon-api-settings'),
    RoonApiStatus    = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport');

const os = require("os");

var utf8 = require('utf8');

// Program states
const STATE_INVALID = 0;                        // Shouldn't be in this after initialisation
const STATE_WAITING_FOR_PAIRING = 1;            // Waiting to pair with Roon Core
const STATE_PROGRAM = 2;                        // Key programming mode
const STATE_AWAITING_ZONE_CONFIGURATION = 3;    // Keys programmed, but zone not configured
const STATE_CONTROLLING_ZONE = 4;               // Accepting keypresses for zone control

// Key types, descriptions, action methods
const key_types = {
    "play_pause" : { description: "Play/Pause", action: play_pause },
    "previous"   : { description: "Previous"  , action: previous },
    "next"       : { description: "Next"      , action: next }
}

// Roon zone bindings
var core = undefined;
var transport = undefined;
var waiting_zones = {};

// Key bindings and zone control settings, stored in and retrieved from Roon
var keyboard_remote_settings = null;

// Current program state
var current_state = STATE_INVALID;

// When state = STATE_PROGRAM, holds key type currently being programmed
var programming_key_type = null;

// When state = STATE_CONTROLLING_ZONE, holds lookup [decoded key_bytes->action method]
var key_string_methods = null;


var roon = new RoonApi({
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

function makelayout(settings) {

    var l = {
        values:    settings,
        layout:    [],
        has_error: false
    };

    // Create a config item allowing zone
    l.layout.push({
        type:       "zone",
        title:      "Controlled zone",
        setting:    "controlled_zone"
    });

    // Create a config item for each key type
    Object.keys(key_types).forEach(function(key_type) {
        l.layout.push({
            type: "string",
            title: key_types[key_type].description,
            setting: key_type
        })
    });

    return l;
}

function update_state() {
    current_state = STATE_INVALID;

    if (core && transport) { // Are we paired?

        // See if we have any unbound keys
        var unbound_key_type = null;
        Object.keys(key_types).forEach(function(key_type) {
            if (keyboard_remote_settings[key_type] === "") {
                unbound_key_type = key_type;
            }
        });

        if (unbound_key_type != null) { // We have unbound keys

            current_state = STATE_PROGRAM;
            programming_key_type = unbound_key_type;

        } else { // All keys bound, and we're paired

            // Build key_string_methods if we don't already have one
            if (key_string_methods === null) {
                key_string_methods = {};
                Object.keys(key_types).forEach(function(key_type) {
                    key_string_methods[keyboard_remote_settings[key_type]] = key_types[key_type].action;
                });
            }

            // Check if the controlled zone has been set
            if (keyboard_remote_settings["controlled_zone"] == null) { // No, let's wait for it

                current_state = STATE_AWAITING_ZONE_CONFIGURATION;

            } else { // Paired, keys bound, controlled zone set - enter controll mode

                current_state = STATE_CONTROLLING_ZONE;

            }

        }

    } else { // Not paired

        current_state = STATE_WAITING_FOR_PAIRING;

    }

    set_status_text();
}

function set_status_text() {
    let status_text = null;

    switch (current_state) {
        case STATE_WAITING_FOR_PAIRING:
            status_text = "Waiting for pairing";
            break;
        case STATE_AWAITING_ZONE_CONFIGURATION:
            status_text = "Please set controlled zone in settings";
            break;
        case STATE_CONTROLLING_ZONE:
            status_text = "Controlling zone " + keyboard_remote_settings["controlled_zone"].name;
            break;
        case STATE_PROGRAM:
            status_text = "Program - press " + key_types[programming_key_type].description;
            break;
        default:
            status_text = "Error - please log issue at https://github.com/mjmaisey/roon-extension-keyboard-remote";
            break;
    }

    svc_status.set_status(status_text, false);
}

function hex_escape(string) {
    var length = string.length;
    var index = -1;
    var result = '';
    var hex;
    while (++index < length) {
        hex = string.charCodeAt(index).toString(16).toUpperCase();
        result += '\\x' + ('00' + hex).slice(-2);
    }
    return result;
}

function display_brief_status(string) {
    svc_status.set_status(string, false);
    setTimeout(function() {
        set_status_text();
    }, 750);

}

function key_press(key) {
    // ctrl-c ( end of text )
    if ( key === '\u0003' ) {
        process.exit();
    }

    switch (current_state) {

        case STATE_CONTROLLING_ZONE:
            let escaped_key_string = hex_escape(key);

            let key_string_method = key_string_methods[escaped_key_string];
            if (key_string_method) {
                key_string_method();
            } else {
                display_brief_status("Received unknown key: " + hex_escape(key));
            }

            break;

        case STATE_PROGRAM:
            keyboard_remote_settings[programming_key_type] = hex_escape(key);
            roon.save_config("keyboard-remote-settings", keyboard_remote_settings);
            key_string_methods = null; // invalidate key_string_methods so it will be rebuilt
            update_state();
            break;

    }

}

function play_pause() {
    display_brief_status("Play/Pause");
    transport.control(keyboard_remote_settings["controlled_zone"].output_id, "playpause");
}

function previous() {
    display_brief_status("Previous");
    transport.control(keyboard_remote_settings["controlled_zone"].output_id, "previous");
}

function next() {
    display_brief_status("Next");
    transport.control(keyboard_remote_settings["controlled_zone"].output_id, "next");
}

function init() {
    keyboard_remote_settings = roon.load_config("keyboard-remote-settings");

    if (keyboard_remote_settings == null) {
        keyboard_remote_settings = {
            controlled_zone: null
        };
        Object.keys(key_types).forEach(function(key_type) {
            keyboard_remote_settings[key_type] = "";
        });
    };

    roon.save_config("keyboard-remote-settings", keyboard_remote_settings);
    update_state();

    // Setup key capture from stdin
    var stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', key_press);
}


var svc_settings = new RoonApiSettings(roon, {
    get_settings: function(cb) {
        cb(makelayout(keyboard_remote_settings));
    },
    save_settings: function(req, isdryrun, settings) {
        let l = makelayout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun) {
            keyboard_remote_settings = l.values;
            svc_settings.update_settings(l);
            roon.save_config("keyboard-remote-settings", keyboard_remote_settings);
            update_state();
        }

    }
});

var svc_status = new RoonApiStatus(roon);

roon.init_services({
    required_services:   [ RoonApiTransport ],
    provided_services:   [ svc_settings, svc_status ]
});

init();
roon.start_discovery();
