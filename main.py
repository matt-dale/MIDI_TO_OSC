import gevent
import eel
import mido
import mido.backends.rtmidi
import logging
import socket    
import json
from os import path
import queue
from threading import Thread
import signal
from pythonosc import udp_client, osc_message_builder

#RUN = False

RUN_VAR = queue.Queue(maxsize=1)
MIDI_MESSAGE_Q = queue.Queue(maxsize=1)

log_level = logging.DEBUG

logging.basicConfig(filename='MIDIOSC_LOG.log',level=log_level, filemode='w')

# start up the web server and test communication functionality
eel.init('webfolder')
logging.warning('started eel webfolder')

def startup_tests():
    """
    checks to see if we can call Javascript functions that are defined in the templates
    """
    logging.warning('Calling Javascript from Python...')
    eel.my_javascript_function(1, 2, 3, 4)


# eel API
@eel.expose
def my_python_function(a, b):
    # test 
    logging.warning('Python function called from Javascript')
    print(a, b, a + b)


@eel.expose
def toggle_run():
    if RUN_VAR.empty():
        RUN_VAR.put('RUNNING')
    else:
        h = RUN_VAR.get()
        # kill the running thread?


@eel.expose
def get_midi_ports():
    """
    returns the list of MIDI input ports
    """
    return mido.get_input_names()

@eel.expose
def js_osc_tester(ip_address, port, address, args):
    """
    """
    x = send_osc_message(ip_address, port, address, args)
    return x 

@eel.expose
def return_midi_note():
    """
    when a note is received that matches the settings, return it!
    """
    if not MIDI_MESSAGE_Q.empty():
        x = MIDI_MESSAGE_Q.get()
        return x
    else:
        return 


def is_int(s):
    """
    returns True if a string can be converted to an int
    """
    try:
        int(s)
        return True
    except:
        return False

def is_float(s):
    """
    returns True if a string can be converted to an float
    """
    try:
        float(s)
        return True
    except:
        return False


def map_midi_value_to_osc_value(cc_value, min_osc, max_osc, midi_type):
    """ 
    given the known range of 0 to 127 for control_change messages, map those 128 steps to the difference of min_osc/max_osc
    """
    if midi_type == 'controL_change':
        cc_value = int(cc_value) + 1
        midi_max = 128
    if midi_type == 'pitchwheel':
        #it's pitchwheel, if it's negative, put it on a positive scale
        cc_value = int(cc_value) + 8193
        midi_max = 16384
    total_osc_steps = int(max_osc) - int(min_osc)
    midi_percentage = int(cc_value)/midi_max
    osc_value = total_osc_steps*midi_percentage
    return osc_value


def send_osc_message(ip_address, port, address, args):
    """
    TODO: add arg type to the system
    """
    client = udp_client.SimpleUDPClient(str(ip_address), int(port))
    if args == '':
        args = None
    msg = osc_message_builder.OscMessageBuilder(address=address)
    if args:
        args = args.split(' ')
        for arg in args:
            if '.' in arg:
                if is_float(arg):
                    arg = float(arg)
                    msg.add_arg(arg)

            elif is_int(arg):
                msg.add_arg(int(arg))
            else:
                msg.add_arg(arg)
    print('osc args: {0}'.format(msg.args))
    msg = msg.build()
    
    client.send(msg)
    #client.send_message(address, args)
    logging.info('sent {0} {1} to {2}:{3}'.format(address, args, ip_address, port))
    return 'sent {0} {1} to {2}:{3}'.format(address, args, ip_address, port)


def start_the_listener(settings_dict, q):
    selected_port = eel.get_selected_port()()
    try:
        midi_port = mido.open_input(selected_port)
        logging.debug('midi port setup successfully in listener function')
    except:
        logging.warning('There was an error opening the MIDI port: {0}'.format(selected_port))
        return {'type':'error opening port'}
    while not q.qsize() == 0:
        for msg in midi_port:
            print(msg)
            compare_midi_note_to_settings_and_send_OSC(settings_dict, msg)
            if q.qsize() == 0:
                break
    else:
        for x in range(0,MIDI_MESSAGE_Q.qsize()):
            MIDI_MESSAGE_Q.get()
        midi_port.close()
        logging.debug('midi port closed')
    return

def compare_midi_note_to_settings_and_send_OSC(settings_dict, note):
    """
    does the heavy lifting of comparing MIDI note to the settings
    then send the corresponding OSC message if it should
    """
    note_type = note.type
    SEND_OSC = False
    if note_type in settings_dict:
        # check the MIDI channel
        for setting_pair in settings_dict[note_type]:
            midi_settings = setting_pair[0]
            osc_settings = setting_pair[1]
            # channel check
            if int(midi_settings['channel'])-1 == note.channel:
                if note_type in ['note_on', 'note_off']:
                    logging.debug("note on or note off found")
                    # note check
                    if midi_settings['note'] == str(note.note):
                        logging.debug('correct note found, sending OSC now!')
                        logging.debug(osc_settings)
                        SEND_OSC = True
                elif note_type in ['program_change']:
                    # check MIDI channgel and program value
                    # prgm check
                    logging.debug('midi_settings[program]:{0}, note.program: {1}'.format(midi_settings['program'], str(note.program)))
                    if midi_settings['program'] == str(note.program):
                        logging.debug('program type found, sending OSC now!')
                        logging.debug(osc_settings)
                        SEND_OSC = True
                elif note_type in ['control_change']:
                    # check MIDI channel, control number
                    logging.debug("control found")
                    # note check
                    if midi_settings['control'] == str(note.control):
                        logging.debug('control type found, sending OSC now!')
                        max_osc = osc_settings['osc_upper_limit']
                        min_osc = osc_settings['osc_lower_limit']
                        converted_value = map_midi_value_to_osc_value(note.value, min_osc, max_osc, 'controL_change')
                        osc_settings['osc_args'] = str(converted_value)
                        logging.debug(osc_settings)
                        SEND_OSC = True
                elif note_type in ['pitchwheel']:
                    # check MIDI channel, and pitch value
                    logging.debug("pitch found")
                    max_osc = osc_settings['osc_upper_limit']
                    min_osc = osc_settings['osc_lower_limit']
                    converted_value = map_midi_value_to_osc_value(note.pitch, min_osc, max_osc, 'pitchwheel')
                    osc_settings['osc_args'] = str(converted_value)
                    SEND_OSC = True
                if SEND_OSC == True:
                    # send OSC!
                    MIDI_MESSAGE_Q.put(midi_settings)
                    _ip = osc_settings['target_ip'].split(':')
                    ip_address = _ip[0]
                    port = _ip[1]
                    address = osc_settings['osc_address']
                    args = osc_settings['osc_args']
                    send_osc_message(ip_address, port, address, args)
    return

def start_midi_osc_conversion(settings):
    """
    settings is the JSON object passed from the UI which includes all neccessary settings
    """
    OSC_rxs = []
    # determine all the OSC clients, and change the dict with key as Midi note type
    settings_dict = {}
    for indx, mapping in settings.items():
        midi_settings = mapping[0]
        osc_settings = mapping[1]
        target_ip_adress = osc_settings['target_ip']
        if target_ip_adress not in OSC_rxs:
            OSC_rxs.append(target_ip_adress)
        midi_type = midi_settings['type']
        if midi_type not in settings_dict:
            settings_dict[midi_type] = [[midi_settings, osc_settings]]
        else:
            settings_dict[midi_type].append([midi_settings, osc_settings])
    global listener_thread
    listener_thread = Thread(target=start_the_listener, args=(settings_dict, RUN_VAR))
    listener_thread.setDaemon(True)
    listener_thread.start()
    return listener_thread


@eel.expose
def load_JSON_file():
    """
    loads the JSON file and returns it
    """
    settings = {}
    if path.exists('midi_osc_settings.json'):
        with open('midi_osc_settings.json', 'r') as f:
            settings = json.load(f)
    else:
        pass
    return settings


@eel.expose
def save_JSON_file():
    """
    saves the current data to a JSON file
    """
    settings = eel.serialize_mappings_table()()
    with open('midi_osc_settings.json', 'w') as outFile:
        obj = json.dumps(settings)
        outFile.write(obj)
    start_midi_osc_conversion(settings)
    return


@eel.expose
def get_ip_address():
    """
    """
    try:
        hostname = socket.gethostname()    
        IPAddr = socket.gethostbyname(hostname)    
        logging.info("Your Computer Name is:" + hostname)    
        logging.info("Your Computer IP Address is:" + IPAddr)
        return IPAddr
    except:
        logging.info('failed to get IP address')
        return ''


@eel.expose
def listen_on_midi_port():
    """
    tries to open the selected MIDI port from the HTML file
    """
    selected_port = eel.get_selected_port()()
    try:
        midi_port = mido.open_input(selected_port)
        logging.warning('midi port setup successfully')
    except:
        logging.warning('There was an error opening the MIDI port: {0}'.format(selected_port))
        return {'type':'error opening port'}
    x = 25
    midi_message = None
    while x > 0:
        x -= 1
        test = midi_port.poll()
        if test:
            midi_message = midi_port.receive()
            if logging.getLogger() == logging.DEBUG:
                print(midi_message)
        gevent.sleep(0.25)
    midi_port.close()
    if logging.getLogger() == logging.DEBUG:
        print('midi port closed')
    if type(midi_message) == mido.messages.messages.Message:
        return midi_message.dict()
    else:
        return {'type':'error'}
  

    return 'THIS THING RETURNED'



# start up the app
eel.start('start.html', port=8080)
