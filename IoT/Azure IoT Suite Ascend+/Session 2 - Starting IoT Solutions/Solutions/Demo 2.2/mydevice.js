// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Protocol = require('/usr/local/lib/node_modules/azure-iot-device-amqp').Amqp;
var Client = require('/usr/local/lib/node_modules/azure-iot-device').Client;
var ConnectionString = require('/usr/local/lib/node_modules/azure-iot-device').ConnectionString;
var Message = require('/usr/local/lib/node_modules/azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = 'PASTE THE DEVICE CONNECTION STRING HERE';
var deviceId = ConnectionString.parse(connectionString).DeviceId;

// Sensors data
var temperature = 50;
var humidity = 50;
var externalTemperature = 55;

// Create IoT Hub client
var client = Client.fromConnectionString(connectionString, Protocol);

// Helper function to print results for an operation
function printErrorFor(op) {
  return function printError(err) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

// Helper function to generate random number between min and max
function generateRandomIncrement() {
  return ((Math.random() * 2) - 1);
}

client.open(function (err, result) {
  if (err) {
    printErrorFor('open')(err);
  } else {

    client.on('message', function (msg) {
      console.log('receive data: ' + msg.getData());

      try {
        var command = JSON.parse(msg.getData());
        if (command.Name === 'SetTemperature') {
          temperature = command.Parameters.Temperature;
          console.log('New temperature set to :' + temperature + 'F');
        }

        client.complete(msg, printErrorFor('complete'));    
      }
      catch (err) {
        printErrorFor('parse received message')(err);
        client.reject(msg, printErrorFor('reject'));
      }
    });

    // start event data send routing
    var sendInterval = setInterval(function () {
      temperature += generateRandomIncrement();
      externalTemperature += generateRandomIncrement();
      humidity += generateRandomIncrement();

      var data = JSON.stringify({
        'DeviceID': deviceId,
        'Temperature': temperature,
        'Humidity': humidity,
        'ExternalTemperature': externalTemperature
      });

      console.log('Sending device event data:\n' + data);
      client.sendEvent(new Message(data), printErrorFor('send event'));
    }, 1000);

    client.on('error', function (err) {
      printErrorFor('client')(err);
      if (sendInterval) clearInterval(sendInterval);
      client.close();
    });
  }
}); 