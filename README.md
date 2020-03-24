# MIDI_TO_OSC
Yet another MIDI/OSC app!
A standalone app converting/mapping MIDI messages to OSC targets

# Purpose 
Create a standalone Windows app similar to the OSCulator Mac app that would receive incoming MIDI messages and send corresponding OSC messages to a variety of targets and addresses.  

Most existing command-line apps didn't offer enough custom formatting of the OSC messages and not all applications or devices that receive OSC have a "learn" feature, hence the need for a MIDI to OSC translator.

This app was designed to work with LightJams, ETC Sound2Light and LightFom with a variety of external MIDI controllers. 

## Testing from source/app design
The app is written in Python and Javascript/HTML, using the Python library Eel which launches a Google Chrome standalone browser window and communicates to the Python code to handle i/o. 
If you want to test it out in Python or work on the codebase:
0. Make sure you have Chrome installed
1. Create a virtualenvironment 
2. Clone this repository
3. Install requirements.tx (`pip install ./requirements.txt`)
4. With the virtualenv activated and in the root of this repo, run `python main.py`
