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

const utf8 = require('utf8'),
      Roon = require('./roon.js')

// Higher level wrapper around Roon API
var roon = undefined;

// Program states
const STATE_INVALID = 0;                        // Shouldn't be in this after initialisation
const STATE_WAITING_FOR_PAIRING = 1;            // Waiting to pair with Roon Core
const STATE_PROGRAM = 2;                        // Key programming mode
const STATE_AWAITING_ZONE_CONFIGURATION = 3;    // Keys programmed, but zone not configured
const STATE_CONTROLLING_ZONE = 4;               // Accepting keypresses for zone control

// Current program state
var current_state = STATE_INVALID;

// When state = STATE_PROGRAM, holds key type currently being programmed
var programming_key_type = null;

// When state = STATE_CONTROLLING_ZONE, holds lookup [decoded key_bytes->action method]
var key_string_methods = null;

// Key types, descriptions, action methods
const key_types = {
    "play_pause" : { description: "Play/Pause", action: transport_action("playpause") },
    "previous"   : { description: "Previous"  , action: transport_action("previous") },
    "next"       : { description: "Next"      , action: transport_action("next") }
}

// Create the layout for the configuration screen
function make_layout() {

    var layout = [];

    // Create a config item allowing zone
    layout.push({
        type:       "zone",
        title:      "Controlled zone",
        setting:    "controlled_zone"
    });

    // Create a config item for each key type
    Object.keys(key_types).forEach(function(key_type) {
        layout.push({
            type: "string",
            title: key_types[key_type].description,
            setting: key_type
        })
    });

    return layout;

}

// Update state based on whether we're paired, all keys are bound, and zone is configured
function update_state() {
    current_state = STATE_INVALID;

    if (roon.is_paired()) { // Are we paired?

        // See if we have any unbound keys
        var unbound_key_type = null;
        Object.keys(key_types).forEach(function(key_type) {
            if (roon.get_setting(key_type) === "") {
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
                    key_string_methods[roon.get_setting(key_type)] = key_types[key_type].action;
                });
            }

            // Check if the controlled zone has been set
            if (roon.get_setting("controlled_zone") == null) { // No, let's wait for it

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

// Update the status text in Roon based on the current state
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
            status_text = "Controlling zone " + roon.get_setting("controlled_zone").name;
            break;
        case STATE_PROGRAM:
            status_text = "Program - press " + key_types[programming_key_type].description;
            break;
        default:
            status_text = "Error - please log issue at https://github.com/mjmaisey/roon-extension-keyboard-remote";
            break;
    }

    roon.set_status_text(status_text);
}

// Turn a received key into its unicode hex-escaped equivalent
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

// Handle key presses, with the action taken depending on whether we're in programming
// state or control state
function key_press(key) {

    // If we receive ctrl-c, exit
    if ( key === '\u0003' ) {
        process.exit();
    }

    switch (current_state) {

        case STATE_CONTROLLING_ZONE:

            let escaped_key_string = hex_escape(key);

            // Retrieve method for the escaped key string and call it
            let key_string_method = key_string_methods[escaped_key_string];
            if (key_string_method) {
                key_string_method();
            }

            break;

        case STATE_PROGRAM:

            roon.set_setting(programming_key_type, hex_escape(key));
            key_string_methods = null; // invalidate key_string_methods so it will be rebuilt

            update_state();

            break;

    }

}

// Carry out an Roon transport action
function transport_action(action) {
    return function() {
        roon.control_transport(action);
    }
}

// Initialise Roon object, current state and keypress event handling, then start Roon
// discovery
function init() {

    // Create the default settings to be used if there are no saved settings
    var default_settings = {
            controlled_zone: null
        };
    Object.keys(key_types).forEach(function(key_type) {
        default_settings[key_type] = "";
    });

    // Initialise roon, providing the config layout, default settings and a
    // callback method to update our state when we're paired/unpaired from the 
    // core, or settings are saved in the Roon UI
    roon = new Roon(make_layout(), update_state, default_settings);

    // Initialise program state
    update_state();

    // Set up event handling for key capture from stdin
    var stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', key_press);

}

init();
