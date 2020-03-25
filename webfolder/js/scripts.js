RUNNING_VAR = 'STOPPED'

// test functionailty from Python to JS and vice versa
eel.expose(my_javascript_function);
function my_javascript_function(a, b, c, d) {
if (a < b) {
    console.log('This was called from Python')
    console.log(c * d);
}
}


//console.log("Calling Python from Javascript...");
//eel.my_python_function(1, 2); // This calls the Python function that was decorated
/* end testing */

async function get_ip(){
    let ip_addr = await eel.get_ip_address()()
    console.log(ip_addr)
    $('#ip_address').html(ip_addr)
}

get_ip()

async function get_midi_ports_from_python(){
    // Inside a function marked 'async' we can use the 'await' keyword.
    let n = await eel.get_midi_ports()(); // Must prefix call with 'await', otherwise it's the same syntax
    var i;
    if (n.length < 1){
        options = '<option>NO DEVICE SELECTED</option>'
    }
    else {
        options = ''
    }
    for (i = 0; i < n.length; i++) {
        options += '<option>'+n[i]+'</option>'
      }
      $('#midi_select').append(options)
}


function render_midi_data(channel, n){
var table =  `<table class="table table-striped midi_message_contents">
                <thead></thead>
                <tbody>
                <tr>
                    <td>channel</td>
                    <td contenteditable="true" class="channel">${channel}</td>
                </tr>
                <tr>
                    <td>note</td>
                    <td contenteditable="true" class="note">${n.note}</td>
                </tr>
                <tr>
                    <td>velocity</td>
                    <td contenteditable="true" class="velocity">${n.velocity}</td>
                </tr>
                <tr>
                    <td>control</td>
                    <td contenteditable="true" class="control">${n.control}</td>
                </tr>
                <tr>
                    <td>program</td>
                    <td contenteditable="true" class="program">${n.program}</td>
                </tr>
                <tr>
                    <td>value</td>
                    <td contenteditable="true" class="value">${n.value}</td>
                </tr>
                <tr>
                    <td>data</td>
                    <td contenteditable="true" class="data">${n.data}</td>
                </tr>
                <tr>
                    <td>pitch</td>
                    <td contenteditable="true" class="pitch">${n.pitch}</td>
                </tr>
                </tbody>
                </table>`
    return table
}

async function receive_listened_midi_note(){
    let n = await eel.return_midi_note()()
    console.log(n)
    if (n.type != undefined){
        channel = parseInt(n.channel) + 1
        temp = `<p class="text-center">MIDI Received</p>
                <table class="table">
                    <thead>
                        <tr>
                            <th>
                                Type
                            </th>
                            <th>
                                Channel
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${n.type}</td>
                            <td>${channel}</td>
                        </tr>
                    </tbody>
                </table>`
        $('#midi_message_deets').html(temp).removeClass('invisible')
    }
    else {
        //$('#midi_message_deets').html('No message heard')
    }
}

var midi_interval, time = 100

function start_listening_on_midi_port(){
    n = eel.listen_on_midi_port();  
    midi_interval = setInterval(receive_listened_midi_note, time) //interval gets cleared in the get_heard_midi_message function
    setTimeout(get_heard_midi_message, 7000)
}


async function get_heard_midi_message() {
    //console.log('getting heard midi message')
    let n = await eel.get_received_midi_message()() 
    $('.listening').parent().next().children().val(n.type)
    channel = n.channel + 1
    table = render_midi_data(channel, n)
    $('.listening').parent().next().next('td').html(table);

    $('#listening_note').remove()
    tds = $('.midi_message_contents tr>td')
    $.each(tds, function(i, val){
        if ($(val).html() == "undefined") {
            $(this).closest('tr').remove()
        }
    })
    clearInterval(midi_interval)
    $('.midi_listen').removeClass('invisible listening').addClass('btn-warning')
    $('#midi_message_deets').html('').addClass('invisible')
}

eel.expose(get_selected_port);
function get_selected_port(){
    x = $('#midi_select').val()
    if (x == 'NO DEVICE SELECTED'){
        alert('Please select a valid MIDI input port')
        return null
    }
    else {
        return x
    }
}


function listen_click_handler(){
    // confirm that no other button has been pressed before allowing this
    $('.midi_listen').click(function(e){
        $(this).removeClass('btn-warning')
        $(this).addClass('invisible listening')
        $(this).parent().append('<span id="listening_note">Listening for 7 seconds</span>')
        start_listening_on_midi_port()
        
    });
}

eel.expose(serialize_mappings_table)
function serialize_mappings_table(){
    // goes through each row in the table and adds it to the JSON object
    mapping_data = {}
    $.each($('.map_row'), function(i, val){
        midi_data_table = $(val).find('.midi_message_contents tbody tr')
        midi_data_obj = {'type':$(val).find('.midi_type').val(),
                        'channel':midi_data_table.find('.channel').html(),
                        'note':midi_data_table.find('.note').html(),
                        'velocity':midi_data_table.find('.velocity').html(),
                        'control':midi_data_table.find('.control').html(),
                        'program':midi_data_table.find('.program').html(),
                        'value':midi_data_table.find('.value').html(),
                        'data':midi_data_table.find('.data').html(),
                        'pitch':midi_data_table.find('.pitch').html()}
        osc_obj = {'target_ip':$(val).find('.target_ip_address').val(),
                    'osc_address':$(val).find('.osc_address').val(),
                    'osc_args':$(val).find('.osc_args').val(),
                    'osc_upper_limit':$(val).find('.osc_upper_value').val(),
                    'osc_lower_limit':$(val).find('.osc_lower_value').val(),
                    'midi_lower_limit':$(val).find('.midi_lower_value').val(),
                    'midi_upper_limit':$(val).find('.midi_upper_value').val(),
                }
        mapping_data[i] = [midi_data_obj, osc_obj]
        
        
    });
    return mapping_data
};


async function check_for_saved_file(){

    let file_data = await eel.load_JSON_file()()
    size = Object.keys(file_data)
    if (size.length > 0){
        // populate the data table!
        $.each(file_data, function(i, obj){
            midi_data = obj[0]
            osc_data = obj[1]
            add_mapping_row()
            val = $('#mappings_table .map_row').last()
            midi_data_table = $(val).find('.midi_message_contents tbody tr')
            $(val).find('.midi_type').val(midi_data['type'])
            midi_data_table.find('.channel').html(midi_data['channel'])
            midi_data_table.find('.note').html(midi_data['note'])
            midi_data_table.find('.velocity').html(midi_data['velocity'])
            midi_data_table.find('.control').html(midi_data['control'])
            midi_data_table.find('.program').html(midi_data['program'])
            midi_data_table.find('.value').html(midi_data['value'])
            midi_data_table.find('.data').html(midi_data['data'])
            midi_data_table.find('.pitch').html(midi_data['pitch'])
            $(val).find('.target_ip_address').val(osc_data['target_ip']),
            $(val).find('.osc_address').val(osc_data['osc_address'])
            $(val).find('.osc_args').val(osc_data['osc_args'])
            $(val).find('.osc_upper_value').val(osc_data['osc_upper_limit']),
            $(val).find('.osc_lower_value').val(osc_data['osc_lower_limit']),
            $(val).find('.midi_lower_value').val(osc_data['midi_lower_limit']),
            $(val).find('.midi_upper_value').val(osc_data['midi_upper_limit'])
        }); //end each
        tds = $('.midi_message_contents tr>td')
        $.each(tds, function(i, val){
            if ($(val).html() == "") {
                $(this).closest('tr').remove()
            }
        });// end tds each removal
        setup_tester_buttons()
        $('.midi_listen').remove()
    }
}


async function send_osc_message(ip, port, address, args, result_div){
    let n = await eel.js_osc_tester(ip, port, address, args)()
    console.log(n)
    $(result_div).html(n).removeClass('alert-danger').show().delay(3000).fadeOut("slow")
}

function add_mapping_row(){
    $('#mappings_table').append("<tr class='map_row'>"+template+"</tr>")
    listen_click_handler()
    $('.remove_row').click(function(){
        $(this).parent().parent().remove()
    });
    $('.add_osc_map').on("mouseup",function(){
        modal = $(this).parent().find('.osc_route_modal')   
        modal.modal()
        // get midi type
        midi_type = $(this).parent().parent().find('.midi_type').val()
        values_div = $(this).parent().find('.limit_mapping_div')
        if (midi_type == 'control_change' || midi_type == 'pitchwheel'){
            if (midi_type == 'pitchwheel'){
                text = `The MIDI pitch wheel values start at 0 and end at 16,384. Please enter the min and max OSC values you want these MIDI values mapped to.
                The MIDI input will be converted to a percentage of the given OSC Range.`
            }
            else {
                text = `The MIDI control change values start at 0 and end at 127. Please enter the min and max OSC values you want these MIDI values mapped to.
                The MIDI input will be converted to a percentage of the given OSC Range.`
            }
            values_div.show()
            values_div.find('.MIDI_note_description').html(text)
            values_div.find('.midi_upper_value').val('127')
            values_div.find('.midi_lower_value').val('0')
        }
        else {
            values_div.hide()
        }
        $('.osc_test_results').hide()

    });// end map click
}


function setup_tester_buttons(){
    $('.osc_tester').on("mouseup", function(){
        console.log($(this))
        // TODO:
        // somthing is weird with this button when loaded from JSON file
        // test with a blank table and add rows to see if it changes the results 
        //
        result_div = $(this).parent().find('.osc_test_results') 
        // check to make sure : char is in the result
        i = $(this).parent().parent().parent().find('.target_ip_address').val()
        if (i.indexOf(':') == -1) {
            $(result_div).html('You need to provide an IP Address and a Port for the OSC receiving device in the format, IP_ADDRESS:PORT_NUMBER').addClass('alert-danger').show()
            return false
        }
        ip_val =  i.split(':')
        ip = ip_val[0]
        port = ip_val[1]
        address = $(this).parent().parent().parent().find('.osc_address').val()
        args = $(this).parent().parent().parent().find('.osc_args').val()
        
        send_osc_message(ip,port,address,args, result_div)   
    });// end osc tester click
} // end setup tester function 


async function get_midi_osc_indicators(){
    let midi_osc = await eel.get_midi_osc_status()()
    console.log(midi_osc)
    if (midi_osc[1] == true){
        
        $('#midi_indicator').css('background-color', '#2e8734')
    }
    else {
        $('#midi_indicator').css('background-color', '#bbb')
    }
    if (midi_osc[0] == true){
        $('#osc_indicator').css('background-color', '#2e8734')
    }
    else {
        $('#osc_indicator').css('background-color', '#bbb')
    }
}

var interval, 
    time = 100

$(document).ready(function(){
    listen_click_handler()
    template = $('#row_template').html()
    
    $('#run').click(function(){
        if ($(this).hasClass('btn-danger')){
            eel.toggle_run()
            eel.save_JSON_file()
            eel.start_midi_osc_conversion()
            $(this).removeClass('btn-danger').addClass('btn-success').html('RUNNING...')
            RUNNING_VAR = 'RUNNING'
            interval = setInterval(get_midi_osc_indicators, time );
        }
        else {
            eel.toggle_run()
            eel.save_JSON_file()
            RUNNING_VAR = 'STOPPED'
            clearInterval( interval );
            $(this).addClass('btn-danger').removeClass('btn-success').html('<i class="fa fa-play-circle"></i> RUN!')
        }
        //eel.toggle_run()

    });
    $('#add_mapping_row').click(function(){
        add_mapping_row()
        setup_tester_buttons()
    });
    get_midi_ports_from_python()
    check_for_saved_file()
}); // end doc ready


/*
// deprecated due to performance issues
function compare_note_object_to_rows(note_obj){
    // return the row that contains the note_obj or return false
    return_row = false
    $.each($('.map_row'), function(i, val){
        midi_data_table = $(val).find('.midi_message_contents tbody tr')
        midi_data_obj = {'type':$(val).find('.midi_type').val(),
                        'channel':midi_data_table.find('.channel').html(),
                        'note':midi_data_table.find('.note').html(),
                        'velocity':midi_data_table.find('.velocity').html(),
                        'control':midi_data_table.find('.control').html(),
                        'program':midi_data_table.find('.program').html(),
                        'value':midi_data_table.find('.value').html(),
                        'data':midi_data_table.find('.data').html(),
                        'pitch':midi_data_table.find('.pitch').html()}
        // return the first one it finds
        if (note_obj.type == midi_data_obj['type']){
            if (parseInt(note_obj.channel) == parseInt(midi_data_obj['channel'])){
                if (note_obj.type == 'note_on' || note_obj.type == 'note_off'){
                    if (parseInt(note_obj.note) == parseInt(midi_data_obj['note'])){
                        return_row = $(this)
                    }
                }
                else if (note_obj.type == 'control_change' || note_obj.type == 'pitchwheel'){
                        return_row = $(this)
                }// end else if
                else if (note_obj.type == 'program_change'){
                    if (note_obj.program == midi_data_obj['program']){
                        return_row = $(this)
                    }
                }
            }
        }
        
    }); // end each
    return return_row
}

// this function is deprecated
async function receive_mapped_midi_notes(){
        let n = await eel.return_midi_note()()
        if (n !== null){
            console.log(n.type, n.channel, n.value, n.note)
             // the midi note that was pressed should highlight the row
            // .addClass('highlighted-row').delay(75).removeClass('highlighted-row')
            x = compare_note_object_to_rows(n)
            if (x !== false) {
                $(x).fadeOut('fast').fadeIn('slow')
            }
    }

        return n
}
*/