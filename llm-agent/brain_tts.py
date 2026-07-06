# brain_tts.py
import asyncio
from ollama import chat  # Hoặc import mô hình AI của bạn nếu sử dụng OpenAI GPT hoặc các mô hình khác
# from edge_tts import Communicate
import os
from pydub import AudioSegment
import pyaudio
import tempfile
import datetime
import pytz
import time
import requests
import json
import requests
import play_music
import paho.mqtt.publish as publish

# Cài đặt cấu hình - Hiển thị LLM cục bộ
api_openai_key = "OPENAI_API_KEY"                     # Bắt buộc, sử dụng chuỗi không có thật cho Llama.cpp
api_local_url = "http://localhost:8000/v1"            # Sử dụng điểm cuối API hoặc nhận xét cho OpenAI
chatbot_agent_name = "Aero"                           # Đặt tên cho bot của bạn
model_spec  ="qwen2:1.5b"                             # Chọn model để sử dụng: Ví dụ gpt-3.5-turbo cho OpenAI
vietnam_timezone = pytz.timezone('Asia/Ho_Chi_Minh')  # Định nghĩa múi giờ cho Việt Nam
PROMPTS_TEST = False                                  # Sử dụng lời nhắc kiểm tra
USING_LOCAL = False                                   # Sử dụng lời nhắc hệ thống cho tin nhắn đầu tiên

# Trạng thái của các đèn
light_status = {
    "light1": False,  # False là tắt, True là bật
    "light2": False,
    "light1andlight2": False
}

# Đặt lời nhắc cơ sở và khởi tạo mảng ngữ cảnh cho đoạn hội thoại
# Định dạng thời gian và ngày theo chuẩn quốc tế
current_date = datetime.datetime.now()
format_date = current_date.strftime("%m/%d/%Y") # định dạng ngày tháng theo chuẩn quốc tế
# Định dạng thời gian và ngày theo khu vực việt nam
current_time_vi = datetime.datetime.now(tz=vietnam_timezone)
date = current_date.strftime("%B %#d, %Y")  
#values["time"] = current_date.strftime("%-I:%M %p")
format_time_vi = current_time_vi.strftime("%H:%M:%S")
format_date_vi = current_time_vi.strftime("%d/%m/%Y") # định dạng theo khu vực việt nam

config_prompt = (
    "You are %s AI, developed by NaVin AIF Technology, an extremely intelligent and friendly assistant. "
    "You can control smart home devices such as lights one and two, white and yellow lights, thermostats, fans, "
    "and security systems. You provide accurate and clear responses, assist users in turning devices on or off, "
    "adjusting settings and providing status updates. You help users answer questions fully and accurately, "
    "with polite and sometimes humorous sentences. Your personality is polite and always respectful to everyone "
    "and tries to help your master. The current date is %s and the current time is %s."
    % (chatbot_agent_name, format_date_vi, format_time_vi)
)

# Câu lệnh hệ thống dành cho phần thời tiết
default_prompts = {}
default_prompts["weather"] = "You are a weather forecaster. Keep your answers brief and accurate. Current date is {date} and weather conditions:\n[DATA]{context_str}[/DATA]\nProvide a weather update, current weather alerts, conditions, precipitation and forecast for {location} and answer this: {prompt}."
# Weather Prompt to instruct AI to process weather information
weather_prompt = """
You are a professional and dedicated forecaster. You are provided with detailed weather data and your task is to provide a concise and clear summary for the user to understand about the weather, warnings and alerts that you deduce for the best for the user, including the following information:
1. Current weather conditions (e.g., clear, cloudy, rainy, etc.).
2. Temperature (current temperature, feels-like temperature).
3. Wind speed and direction.
4. Any other relevant details such as humidity, UV index, moon phases, sun and moon cycle, etc.
5. Forecast for the next few days, including temperature range and any useful warnings for the user based on current weather conditions.

Here is the weather data:
[DATA]
{context_str}
[/DATA]
The current date is {date} and the current time is {time}.
Provide a weather update, current weather alerts, conditions, precipitation, and forecast for {location}.

Please summarize the weather conditions in a clear and simple way for the user to understand. The summary should be easy to comprehend and provide the best recommendations for the user based on the current weather (e.g., if it’s raining, suggest bringing an umbrella).
"""

# Lấy dữ liệu thời tiết cho một thành phố
def get_weather(location):
    if location == "":
        location = "Hochiminh"
    location = location.replace(" ", "+")
    url = f"https://wttr.in/{location}?format=j2"
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()  # Trả về dữ liệu JSON từ API
    else:
        return None  # Trả về None nếu không lấy được dữ liệu


# Hàm gửi dữ liệu MQTT
async def send_mqtt_message(topic, message):
    try:
        publish.single(topic, message, hostname="mqtt.eclipseprojects.io")
        print(f"Message '{message}' sent to topic '{topic}'")
    except Exception as e:
        print(f"Failed to send message to MQTT: {e}")


async def control_light(light_id, action):
    """
    Điều khiển bật/tắt đèn và kiểm tra trạng thái đèn.
    light_id: "light1" hoặc "light2"
    action: "on" hoặc "off"
    """
    global light_status  # Sử dụng biến toàn cục để lưu trạng thái đèn

    # Kiểm tra nếu đèn đã ở trạng thái mong muốn
    # if action == "on" and light_status[light_id]:
    #     return f"I'm sorry, there seems to have been a mistake! {light_id} already enabled, do you need to do anything else?"
    # elif action == "off" and not light_status[light_id]:
    #     return f"It looks like {light_id} was turned off before, do you want to turn it on or do anything else?"
    if light_id != "light1andlight2":
        if action == "on" and light_status[light_id]:
            return f"I'm sorry, there seems to have been a mistake! {light_id} already enabled, do you need to do anything else?"
        elif action == "off" and not light_status[light_id]:
            return f"It looks like {light_id} was turned off before, do you want to turn it on or do anything else?"

    try:
        if light_id == "light1":
            await send_mqtt_message("/topic/qos0", action.upper())
            light_status["light1"] = (action == "on")
        elif light_id == "light2":
            await send_mqtt_message("/topic/qos1", action.upper())
            light_status["light2"] = (action == "on")
        elif light_id == "light1andlight2":
            await send_mqtt_message("/topic/qos0", action.upper())
            await send_mqtt_message("/topic/qos1", action.upper())
            light_status["light1"] = (action == "on")
            light_status["light2"] = (action == "on")
        else:
            return "Invalid light ID."

        return f"I've done it! {light_id} was {action}. How else can I help you?"
    except Exception as e:
        return f"An error occurred: {e}"

# Hàm xử lý và trích xuất dữ liệu từ JSON
def process_weather_data(weather_data):
    # Trích xuất thông tin từ dữ liệu JSON
    weather_desc = weather_data["current_condition"][0]["weatherDesc"][0]["value"]
    temperature = weather_data["current_condition"][0]["temp_C"]
    feels_like = weather_data["current_condition"][0]["FeelsLikeC"]
    wind_speed = weather_data["current_condition"][0]["windspeedKmph"]
    wind_direction = weather_data["current_condition"][0]["winddir16Point"]
    humidity = weather_data["current_condition"][0]["humidity"]
    precipitation = weather_data["current_condition"][0]["precipMM"]

    # Thông tin về mặt trời và mặt trăng
    moon_phase = weather_data["weather"][0]["astronomy"][0]["moon_phase"]
    moon_illumination = weather_data["weather"][0]["astronomy"][0]["moon_illumination"]
    moonrise = weather_data["weather"][0]["astronomy"][0]["moonrise"]
    moonset = weather_data["weather"][0]["astronomy"][0]["moonset"]
    sunrise = weather_data["weather"][0]["astronomy"][0]["sunrise"]
    sunset = weather_data["weather"][0]["astronomy"][0]["sunset"]
    
    # Tạo thông tin để AI xử lý
    context_str = (
        f"Current weather: {weather_desc}. "
        f"Temperature: {temperature}°C (feels like {feels_like}°C). "
        f"Wind: {wind_speed} km/h from {wind_direction}. "
        f"Humidity: {humidity}%. "
        f"Precipitation: {precipitation} mm.\n"
        f"Moon phase: {moon_phase} (illumination: {moon_illumination}%). "
        f"Moonrise: {moonrise}, Moonset: {moonset}. "
        f"Sunrise: {sunrise}, Sunset: {sunset}."
    )
    return context_str

# Hàm gọi AI để tạo câu trả lời từ weather data
# Hàm cho bộ não xử lý và suy luận thời tiết
async def generate_weather_response(weather_data):
    # Trích xuất và xử lý dữ liệu thời tiết
    context_str = process_weather_data(weather_data)
    # Tạo câu hỏi cho AI
    prompt = weather_prompt.format(date=format_date_vi, time=format_time_vi, context_str="..." , location="Ho Chi Minh")

    # Gửi dữ liệu cho AI (OpenAI, Ollama, etc.)
    stream = chat(
                model='qwen2:1.5b', 
                messages=[
                    {'role': 'system', 'content': prompt}
                    ], 
                stream=True,)
    
    response = ""
    for chunk in stream:
        text_chunk = chunk['message']['content']
        if text_chunk:
            response += text_chunk
    return response.strip()

# Hàm main cho bộ não xử lý và suy luận mặc định
async def generate_response(user_input):
    print(f"AI received: {user_input}")
    # Đảm bảo các từ khóa dễ nhận diện cho lệnh bật tắt đèn
    light_actions = {
        "light1": ["light one", "white light"],
        "light2": ["light two", "yellow light"],
        "light1andlight2": ["light one and light two", "white light and yellow light", "both", "lights", "both lights"]
    }
    action_keywords = {
        "turn on": "on",
        "turn off": "off"
    }
    
    # Lặp qua các hành động bật/tắt đèn
    for light_id, keywords in light_actions.items():
        for keyword in keywords:
            for action, api_action in action_keywords.items():
                if action in user_input.lower() and keyword in user_input.lower():
                    # Gọi hàm điều khiển đèn và nhận phản hồi
                    result = await control_light(light_id, api_action)
                    # Thông báo về trạng thái bật/tắt đèn
                    # print(result)
                    # await speak_text(result)  # Phát giọng nói thông báo kết quả
                    return result  # Trả về kết quả cho người dùng
                
    try:
        if 'thời tiết' in user_input.lower() or 'weather' in user_input.lower():
            # Lấy thông tin thời tiết cho một thành phố
            location = "Hochiminh"  # Thành phố có thể thay đổi theo yêu cầu người dùng
            weather_data = get_weather(location)
            if weather_data:
                weather_report = await generate_weather_response(weather_data)
                return weather_report  # Trả về thông tin thời tiết đã được AI diễn giải
            else:
                return "Sorry, I couldn't fetch the weather data."
 

        # Nếu không phải yêu cầu về thời tiết, gọi AI để lấy phản hồi
        stream = chat(
            model='qwen2:1.5b',  # Sử dụng mô hình AI bạn chọn
            messages=[
                {'role': 'system', 'content': config_prompt},
                {'role': 'user', 'content': user_input}
            ],
            stream=True,
        )

        response = ""
        for chunk in stream:
            text_chunk = chunk['message']['content']
            if text_chunk:
                response += text_chunk

        return response.strip()  # Trả về phản hồi đã được tạo từ AI model
    
    except Exception as e:
        print(f"Error with AI response: {e}")
        return "Sorry, I couldn't process your request at the moment."