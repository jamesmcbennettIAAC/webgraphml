#pip install Flask
#pip install waitress flask-cors
#python app.py

from flask import Flask, request, render_template, jsonify
from waitress import serve
# from customPythonFile import customPythonFunction
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_data():
    # Get JSON data from the request
    data = request.get_json()
    print (data)

    # Do some processing here...
    processed_data = data  # Just echo the data back

    # Return processed data as JSON
    #return "OK"
    return jsonify(processed_data)
    #return "it works.... " + str(processed_data)


if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=8000)
