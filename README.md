# MIDI_TO_OSC
Yet another MIDI/OSC app!
A standalone app converting/mapping MIDI messages to OSC targets

# Purpose 
Create a standalone Windows app similar to the OSCulator Mac app that would receive incoming MIDI messages and send corresponding OSC messages to a variety of targets and addresses.  

Most existing command-line apps didn't offer enough custom formatting of the OSC messages and not all applications or devices that receive OSC have a "learn" feature, hence the need for a MIDI to OSC translator.

This app was designed to work with LightJams, ETC Sound2Light and LightFom with a variety of external MIDI controllers. It should work with any device or application that can be controlled via OSC over UDP. 

## Prerequisites
A Windows 10 PC with Google Chrome installed, some sort of MIDI interface (an internal Loopback interface, or a USB MIDI interface), and a working network is required to use the app.

## Download and install
The current release is v2.0.0-beta and needs testing.  Please download the zipped v2-beta.zip from the releases page. https://github.com/matt-dale/MIDI_TO_OSC/releases 
Extract the folder and run "main.exe" inside the main folder.  This distribution is a debug version which displays a command line window behind the app displaying any errors that may have occurred. 

## Typical workflow
The app boots up and displays some basic instructions then displays either a blank MIDI Message table, or a filled in one based on the last time you used the app. The user can add or edit this table using the various controls: Add a Mapping, OSC Details, or changing the MIDI Message type, or editing the MIDI Message table. Adding a row to the table with the Add a Mapping button supplies a "Learn MIDI Command" button.  When this button is pressed, the app listens on the MIDI port for messages and displays the last received message in a box under the Add a Mapping button.  After a 7 second listening window, the app automatically inserts the last received MIDI message into the MIDI message table. This "Learn MIDI Command" is helpful for those users that aren't familiar with manually entering MIDI details. 

Once a MIDI message is added to the table, a corresponding OSC command should be manually entered using the OSC Details button.  The details entered in this dialog box are the heart of the app. When the MIDI message is received, the corresponding OSC command is sent.
The Target Device IP Address/Port field is very important. This tells the app where to send the OSC message and to which port.  Most applications will either have the port number configurable in a settings menu, or in the device's manual.  Please note: if you are going to control an application on the same computer that is running the MIDI to OSC app, do not use port 8080 as the app uses this port for communications.  You need to enter the IP Address and Port in the format given in the field (IPAddress:Port).

After the IP Address and port are entered, type in the OSC message and any value that you want sent with this message in the OSC Address field and the OSC Args field.  You can use the Test OSC Message to confirm that the message is being received properly on the target device. 

If the corresponding MIDI message type is either Control Change or Pitch Bend, then more fields are displayed to be filled in. The Upper OSC Value and Lower OSC Value are the minimum and maximum values that should be sent to the target device when the MIDI message is received.  This allows for scaling the outgoing OSC command values.  For example, a Master Intensity slider in LightJams only has values from 0 to 100, whereas the Control Change message has values from 0-128.  If we want to control that slider with an Control Change MIDI message and simply send the MIDI value that is received to the slider, then when we get to the top of the MIDI Control Change (values 101-128) the OSC controlled slider will simply be at its maximum of 100, effectively making the top portion of the MIDI controller useless.  If we fill in the Upper and Lower values to match the values that LightJams can accept, then the app will send out proportional messages to OSC from 0 to 100, making use of the entire MIDI controller range. 

Once everything is entered and tested, click the RUN! button.  At this point, the app goes to work.  There are Incoming MIDI and Outgoing OSC indicators to let you know that the app is working for help with troubleshooting. 

If you'd like to save the current mapping to a file and create a new one, simply go into the folder where the app is run from and rename the midi_osc_settings.json file to something else.  Then when you want to use that mapping again in the future, rename it to midi_osc_settings.json and the app will load it. 

## Testing from source/app design
The app is written in Python and JavaScript/HTML, using the Python library Eel which launches a Google Chrome standalone browser window and communicates to the Python code to handle i/o. 
If you want to test it out in Python or work on the codebase, first make sure you have Chrome installed
1. Create a virtualenvironment 
2. Clone this repository
3. Install requirements.txt (`pip install ./requirements.txt`)
4. With the virtualenv activated and in the root of this repo, run `python main.py`
