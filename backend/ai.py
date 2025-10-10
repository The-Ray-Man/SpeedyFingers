from datetime import datetime, timedelta

from litellm import _turn_on_debug, completion
from pydantic import ValidationError

from models import TodoItem, TodoItemForCreate

# _turn_on_debug()  # Uncomment for debugging litellm requests


class AIService:
    def __init__(self, api_model: str, api_base_url: str, api_key: str):
        self.api_key = api_key
        self.api_base_url = api_base_url
        self.api_model = api_model

    def _generate_todo_prompt(self, prompt: str) -> str:
        today = datetime.now()
        today_iso = today.isoformat()
        today_weekday = datetime.now().strftime("%A")

        next_week = today + timedelta(weeks=1)
        next_monday = today + timedelta(days=(7 - today.weekday()) % 7 or 7)

        return [
            {
                "role": "system",
                "content": f"You are a personal assistant that converts user input into a concise todo item with description. Today is {today_iso} ({today_weekday}).",
            },
            {
                "role": "user",
                "content": "I need to clean my room because it's messy today.",
            },
            {
                "role": "assistant",
                "content": TodoItemForCreate(
                    title="Clean room",
                    description="Organize and tidy up living space",
                    deadline=today,
                ).model_dump_json(),
            },
            {
                "role": "user",
                "content": "I have to finish my project report by next week.",
            },
            {
                "role": "assistant",
                "content": TodoItemForCreate(
                    title="Finish project report",
                    description="Complete final report and submit",
                    deadline=next_week,
                ).model_dump_json(),
            },
            {"role": "user", "content": "Call my mom next Monday"},
            {
                "role": "assistant",
                "content": TodoItemForCreate(
                    title="Call mom",
                    description="Phone call with mother",
                    deadline=next_monday,
                ).model_dump_json(),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]

    def generate_todo(self, prompt: str, retries: int = 3) -> TodoItem:
        response = completion(
            model=self.api_model,
            api_key=self.api_key,
            base_url=self.api_base_url,
            messages=self._generate_todo_prompt(prompt),
            response_format=TodoItem,
        )

        try:
            return TodoItem.model_validate_json(response.choices[0].message.content)
        except ValidationError as e:
            if retries > 0:
                return self.generate_todo(prompt, retries - 1)
            else:
                raise ValueError(f"Invalid response from LLM: {e}")
