from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from app import create_chat_session, get_chat_response, save_session_data
import uuid
import os, json
app = Flask(__name__)
CORS(app)
sessions = {}

if not os.path.exists("logs"):
    os.makedirs("logs")
@app.route('/')
def home():
    return render_template('index.html')
@app.route('/api/chat', methods=['POST'])
def chat():

    try:
        data = request.json
        user_input = data.get('message', '').strip()
        session_id = data.get('session_id')
        if not user_input:
            return jsonify({'error': 'Message is required'}), 400
        if session_id and session_id in sessions:
            session = sessions[session_id]
        else:
            session_id = str(uuid.uuid4())  # generate a unique session ID
            session = create_chat_session(session_id)
            sessions[session_id] = session

        result = get_chat_response(user_input, session)
        return jsonify({
            'response': result['response'],
            'session_id': session_id,
            'user_name': result.get('user_name')

        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_log/<session_id>', methods=['POST'])

def save_log(session_id):
    try:
        if session_id in sessions:
            session = sessions[session_id]
            filepath = save_session_data(session)
            return jsonify({"message": "Log saved from memory", "file": filepath})
        chat_log = request.json if request.is_json else None

        if chat_log:
            filepath = f"logs/{session_id}.json"
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(chat_log, f, indent=2)
            return jsonify({"message": "Log saved from request body", "file": filepath})
        return jsonify({"error": "No session or chat log found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)