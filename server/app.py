import os
import re
import json
import logging
import datetime
from typing import Dict

import google.generativeai as genai
from dotenv import load_dotenv

from prompts import SYSTEM_PROMPT


# ------------------ API Setup ------------------
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


# ------------------ Logging Setup ------------------
def setup_logging():
    if not os.path.exists('logs'):
        os.makedirs('logs')

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/icustoms_chatbot.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger('iCustomsBot')


logger = setup_logging()


# ------------------ Session Management ------------------
class UserSession:
    def __init__(self, session_id=None):
        self.session_id = session_id or f"session_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.user_data = {
            "name": None,
            "user_type": "unknown",
            "current_product": None,
            "current_predictions": [],
            "conversation_history": [],
            "preferences": {"voice_enabled": False},  # Voice disabled in backend
            "start_time": datetime.datetime.now().isoformat(),
            "issues_resolved": [],
            "last_intent": None
        }

    def update_conversation(self, role: str, message: str):
        self.user_data["conversation_history"].append({
            "role": role,
            "message": message,
            "timestamp": datetime.datetime.now().isoformat()
        })
        # Keep only last 20 messages for context
        if len(self.user_data["conversation_history"]) > 20:
            self.user_data["conversation_history"] = self.user_data["conversation_history"][-20:]

    def log_issue_resolution(self, issue: str, solution: str):
        self.user_data["issues_resolved"].append({
            "issue": issue,
            "solution": solution,
            "timestamp": datetime.datetime.now().isoformat()
        })
        logger.info(f"Issue resolved - User: {self.user_data.get('name', 'Unknown')}, Issue: {issue[:100]}...")

    def save_session_log(self):
        try:
            log_data = {
                "session_id": self.session_id,
                "user_data": self.user_data,
                "end_time": datetime.datetime.now().isoformat()
            }

            log_file = f"logs/session_{self.session_id}.json"
            with open(log_file, 'w') as f:
                json.dump(log_data, f, indent=2)

            logger.info(f"Session saved: {log_file}")
            return log_file
        except Exception as e:
            logger.error(f"Error saving session log: {str(e)}")
            return None


session = UserSession()


# ------------------ LLM-Powered Chat Function ------------------
def process_chat_message(user_input: str, current_session: UserSession = None) -> str:
    global session
    if current_session:
        session = current_session

    logger.info(f"User: {user_input}")

    try:
        current_time = datetime.datetime.now().strftime('%I:%M %p')
        user_name = session.user_data.get('name', 'not provided')

        full_prompt = (
            f"SYSTEM PROMPT: {SYSTEM_PROMPT}\n\n"
            f"CURRENT CONTEXT:\n"
            f"Current time: {current_time}.\n"
            f"User name: {user_name}\n\n"
            f"CONVERSATION HISTORY (for contextual awareness):\n"
        )
        for entry in session.user_data["conversation_history"][-5:]:
            full_prompt += f"{entry['role'].capitalize()}: {entry['message']}\n"

        full_prompt += f"\nUSER INPUT: {user_input}"

        response = model.generate_content(full_prompt)

        if not session.user_data["name"]:
            name_match = re.search(r'(?:my name is|i am|call me) ([\w\s]+)', user_input, re.IGNORECASE)
            if name_match:
                name = name_match.group(1).strip()
                if 1 < len(name) < 30:
                    session.user_data["name"] = name.title()
                    logger.info(f"User provided name: {session.user_data['name']}")

        clean_response = re.sub(r'[\*#]', '', response.text.strip())
        return clean_response

    except Exception as e:
        logger.error(f"LLM generation error: {str(e)}")
        return "Sorry, I'm having trouble generating a response right now. Please try again."


# ------------------ Standalone Chatbot Function ------------------
def chatbot():
    try:
        initial_prompt = "Hello there. Please introduce yourself and state how you can help me."
        welcome = process_chat_message(initial_prompt)
        print("iCody: " + welcome)

        logger.info("Chatbot session started")

        while True:
            try:
                user_input = input("\nYou: ").strip()

                if not user_input:
                    continue
                if user_input.lower() == "exit":
                    print("iCody: Goodbye! Thank you for using iCustoms.")
                    session.save_session_log()
                    break

                session.update_conversation("user", user_input)
                response = process_chat_message(user_input)
                session.update_conversation("assistant", response)

                print("iCody: " + response)

            except KeyboardInterrupt:
                print("\niCody: Session ended. Thank you for using iCustoms!")
                session.save_session_log()
                break
            except Exception as e:
                logger.error(f"Chatbot loop error: {str(e)}")
                print("iCody: Oops, something went wrong. Please try again.")

    except Exception as e:
        logger.error(f"Fatal chatbot error: {str(e)}")
        print("iCody: Unable to start the chatbot due to a technical issue.")


# ------------------ Flask Integration Functions ------------------
def create_chat_session(session_id=None):
    return UserSession(session_id)


def get_chat_response(user_input: str, current_session: UserSession) -> Dict:
    try:
        response_text = process_chat_message(user_input, current_session)
        current_session.update_conversation("user", user_input)
        current_session.update_conversation("assistant", response_text)

        return {
            "response": response_text,
            "session_id": current_session.session_id,
            "user_name": current_session.user_data.get("name")
        }
    except Exception as e:
        logger.error(f"Flask response error: {str(e)}")
        return {
            "response": "Sorry, something went wrong while processing your request.",
            "session_id": current_session.session_id,
            "user_name": current_session.user_data.get("name")
        }


def save_session_data(current_session: UserSession):
    return current_session.save_session_log()

# ------------------ Run ------------------
if __name__ == "__main__":
    print("Starting iCustoms Chatbot iCody")
    print("Type 'exit' to end\n")
    chatbot()