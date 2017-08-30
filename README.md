# roon-extension-keyboard-remote

Roon Extension to control playback via keypresses, and hence via any remote control that can
generate a keypress. This includes Harmony Hubs - although the setup process is a little fiddly.

------------

## Installation on DietPi

1. Install Node.js from dietpi-software > Software Additional 

1. Download the Keyboard Remote extension.

   ```bash
   cd /opt
   git clone https://github.com/mjmaisey/roon-extension-keyboard-remote.git
   ```

1. Install the dependencies:
    ```bash
    cd roon-extension-keyboard-remote
    npm install
    ```

1. Install to start on the second virtual console automatically on startup
    ```bash
    mkdir /etc/roon-extension-keyboard-remote
    cp changevt.service roon-extension-keyboard-remote.service /lib/systemd/system
    systemctl enable roon-extension-keyboard-remote.service
    systemctl enable changevt.service
    ```

1. Reboot
    ```bash
    shutdown -r now
    ```

    The extension should appear in Roon now. See Settings->Setup->Extensions and you should see it in the list.


------------

## Using a Bluetooth keyboard

1. Enable Bluetooth in dietpi-config > Advanced

1. Run bluetoothctl and pair the Bluetooth keyboard, which should look something like the following (with 
   different device addresses, of course)
    ```
    [NEW] Controller 11:22:33:44:55:66 dietpi [default]
    [bluetooth] agent on
    [bluetooth] default-agent
    [bluetooth] scan on
    [CHG] Controller 11:22:33:44:55:66 Discovering: yes
    [NEW] Device AA:BB:CC:DD:EE:FF Harmony Keyboard
    [bluetooth] pair AA:BB:CC:DD:EE:FF
    Attempting to pair with AA:BB:CC:DD:EE:FF
    Pairing successful
    [bluetooth] connect AA:BB:CC:DD:EE:FF
    Attempting to connect to AA:BB:CC:DD:EE:FF
    Connection successful
    [bluetooth] trust AA:BB:CC:DD:EE:FF
    Changing AA:BB:CC:DD:EE:FF trust succeeded
    [bluetooth] exit
    ```

------------

## Using a Harmony Hub as a bluetooth keyboard

1. Create a new 'Windows PC' device in the Harmony app

1. Create a new Activity using the device in the Harmony app (and any amp you'd like to control). This 
   should then prompt you to pair, at least in the iOS app - this doesn't seem to work in the Harmony
   desktop app. Do the pairing on the Raspberry Pi as above.

1. You'll need to alter the buttons on the activity, as Harmony's default media key mappings only seem to
   result in a null keypress on a Raspberry Pi. I found space for play/pause and left/right direction 
   keys for previous and next track respectively work well.

------------

## Enabling and programming the extension

1. Open Roon on any device (PC, Mac, iPad etc.)

1. Go to Settings > Extensions

1. Enable the Extension. The status should change to 'Program - press Next'

1. Press the relevant keys on your control device (currently Next, Previous, Play/Pause) in response to the
   prompts

1. Go into the extension settings and select your controlled zone, then click 'Save'

1. The status should now read 'Controlling zone <zone name>'. Enjoy.

If you do not have particular keys on your control device, going into the settings and entering a dash into
the fields for the relevant key and pressing 'Save' will result in the key being skipped during programming.

If you wish to reprogram any key, simply delete the contents of the field for the key(s) in the extension
Settings and it will go back into programming mode for the keys.
