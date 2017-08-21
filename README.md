# roon-extension-keyboard-remote

Roon Extension to control playback via keypresses, and hence via any remote control that can
generate a keypress.

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
