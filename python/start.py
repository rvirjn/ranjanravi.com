import os
from pymongo import MongoClient, cursor
import traceback
import pymongo
client = None
import json
_db = None
_results = None
import requests
from flask import Flask, render_template_string, request, jsonify, render_template
app = Flask(__name__, static_url_path='/static')

headers = {'Content-Type': 'application/json'}
__author__ = 'raviranjan'

@app.route('/')
def index():
    message = "Hello, World"
    #return render_template('index.html')
    return render_template_string('''
         <title>Ravi Ranjan</title>
         <h2>HI Ravi</h2>
         ''')


@app.route('/main')
def main():
    resp = requests.post('http://0.0.0.0/insert', data={'339591', 'Ravi Ranjan', '28', 'india'}, headers=headers,
                         verify=False)
    print resp.json()
    # get()
    # update('339591', 'Ravi Ranjan', '29', 'india')
    # delete('339591')


@app.route('/insert', methods=['POST'])
def insert():
    app.logger.debug('insert method called')
    content_type = request.headers.get('Content-Type')
    app.logger.debug('Content-Type %s', content_type)
    data = {}
    if content_type == 'application/json':
        data = request.json
    else:
        data = request.form.to_dict()
    app.logger.debug('POST emp data: %s' % data)
    mongo_id = None
    try:
        insert = _results.insert_one(data)
        mongo_id = str(insert.inserted_id)
    except (pymongo.errors.AutoReconnect,
            pymongo.errors.NotMasterError,
            pymongo.errors.ConnectionFailure,
            pymongo.errors.CollectionInvalid,
            pymongo.errors.NetworkTimeout,
            pymongo.errors.ServerSelectionTimeoutError) as ex:
        log_exception(ex)
    return json.dumps({'id': mongo_id})


@app.route('/read/<emp_id>', methods=['GET'])
def get(emp_id):
    app.logger.debug('GET emp_id: %s' % emp_id)
    try:
        values = cursor.Cursor(_results, {'emp_id':
                                                      emp_id}, limit=5) \
            .sort('interopTestDate', pymongo.DESCENDING)
    except:
        return not_found()
    data = list()
    for val in values:
        val['_id'] = str(val['_id'])
        # val.pop('_id')
        data.append(val)
    return json.dumps(data)


@app.route('/update')
def update(criteria, name, age, country):
    # Function to update record to mongo db
    try:
        _db.Employees.update_one(
            {"id": criteria},
            {
                "$set": {
                    "name": name,
                    "age": age,
                    "country": country
                }
            }
        )
        print "\nRecords updated successfully\n"
    except Exception, e:
        print str(e)


@app.route('/delete')
def delete(criteria):
    # Function to delete record from mongo db
    try:
        _db.Employees.delete_many({"id":criteria})
        print '\nDeletion successful\n'
    except Exception, e:
        print str(e)


def log_exception(exception):
    app.logger.error('Exception: %s Trace: %s' % (exception,
                                                  traceback.format_exc()))


@app.errorhandler(404)
def not_found(error=None):
    message = {
            'status': 404,
            'message': 'Not Found: ' + request.url,
    }
    response = jsonify(message)
    response.status_code = 404
    return response

if __name__ == "__main__":

    # if SERVER_PORT, DB_PORT is not passed then default DB will run.
    if 'DB_PORT' in os.environ:
        db_port = int(os.environ['DB_PORT'])
    else:
        db_port = 27017

    if 'SERVER_PORT' in os.environ:
        server_port = int(os.environ['SERVER_PORT'])
    else:
        server_port = 80

    app.logger.debug("DB_PORT: %s | SERVER_PORT: %s" % (db_port, server_port))
    client = MongoClient('localhost:%s' % db_port)
    # creating connections for communicating with Mongo DB
    _db = client['EmployeeData']
    _results = _db['results']
    app.run('0.0.0.0', port=server_port, debug=True)
    # app.run('0.0.0.0', port=server_port, ssl_context='adhoc', debug=True)
