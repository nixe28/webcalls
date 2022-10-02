#!/usr/bin/env python3

import os
from flask import Flask, request, send_from_directory, Response, render_template
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS

STATIC_PATH = os.path.dirname(os.path.realpath(__file__)) + '/../demo/build'

app = Flask(__name__, static_url_path=STATIC_PATH, static_folder=STATIC_PATH)
app.config["DEBUG"] = True
CORS(app)
app.secret_key = 'random secret key!'
socketio = SocketIO(app, cors_allowed_origins="*")
print("server is running")


@app.route('/<path:path>')
def send_report(path):
    print(path)
    return send_from_directory(STATIC_PATH, path)

@app.route('/')
def send_index():
    return send_from_directory(STATIC_PATH, "index.html")


@socketio.on('join')
def join(message):
    username = message['username']
    room = message['room']
    join_room(room)
    print('RoomEvent: {} has joined the room {}\n'.format(username, room))
    emit('ready', {username: username}, to=room, skip_sid=request.sid)


@socketio.on('data')
def transfer_data(message):
    username = message['username']
    room = message['room']
    data = message['data']
    print('DataEvent: {} has sent the data:\n {}\n'.format(username, data))
    emit('data', data, to=room, skip_sid=request.sid)


@socketio.on_error_default
def default_error_handler(e):
    print("Error: {}".format(e))
    socketio.stop()


if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=9000)