# roon-extension-keyboard-remote

Roon Extension to control playback via keypresses, and hence via any remote control that can
generate a keypress.

IMPORTANT: 

* After installation, the main systemd service for this extension will autostart and start receiving keypresses on the 
  second virtual console. A second service will, after five seconds, automatically switch the active virtual console to 
  the second one. If you need to login directly on the physical console, you will need to switch back to the first to see
  a login prompt. To do this, use Alt+F1, or Alt+Left. To switch back and resume remote control, use Alt+F2, or Alt+Right.

* Ensure that you *do not* have 'PSU noise reduction' enabled in dietpi-config > Audio options. If you do, this will disable 
  HDMI, including the virtual console, and boot-up will not complete, so you won't be able to SSH in. If you manage to find
  yourself in this situation, to recover, take out the MicroSD card and, on another computer edit dietpi.txt. Find the line
  
  ```
  rpi_hdmi_output=0
  ```
  
  and change it to 
  
  ```
  rpi_hdmi_output=1
  ```
  
  You will then be able to boot once with HDMI on. Log in, start dietpi-config, go to Audio options and turn off 
  'PSU noise reduction' to fix the problem.

------------

## Installation on DietPi

1. Install Node.js from dietpi-software > Software Additional 

1. Download the Keyboard Remote extension.

   ```bash
   apt-get install git
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
