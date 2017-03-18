import requests
import yaml
import datetime, time
import os
import argparse

parser = argparse.ArgumentParser(description='wavelo usage data collector')
parser.add_argument('-o', '--output_folder', nargs=1, default=['.'], type=str, help='folder in which outpud data are saved', dest='path_to_output_dir')
args = parser.parse_args()

path_to_output_dir  = args.path_to_output_dir[0]

if not os.path.exists(path_to_output_dir):
    raise SystemExit('Path %s does not exist.' %(path_to_output_dir))
if not os.path.isdir(path_to_output_dir):
    raise SystemExit('Path %s is not a directory.' %(path_to_output_dir))

date = curr_time = datetime.datetime.now().strftime('%Y-%m-%d')

data_file = 'wavelo_data-%s.yaml'%(date)
data_file_summary = 'wavelo_data_summary-%s.yaml'%(date)
all_bikes_data = 'bike_ids.yaml'

network_id = 105 #Wavelo network id
server = 'https://app.socialbicycles.com/api/'
hubs_endpoint = 'networks/%d/hubs.json'%(network_id)
bikes_endpoint = 'networks/%d/bikes.json?per_page=300'%(network_id)
bike_endpoint = 'bikes/%d' #%d for bike_id

user = os.environ['SOCIALB_USER']
password = os.environ['SOCIALB_PASSWORD']

curr_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
timestamp = time.time()

hubs_data = {}
bikes_data = {}

data_summary = {
    curr_time : {
        'timestamp' : timestamp,
    }
}

#Hubs data
all_available_bikes_hubs = 0
all_current_bikes_hubs = 0

r = requests.get(server + hubs_endpoint, auth=(user, password))
hubs = r.json()['items']

for hub in hubs:
    keys = ['id', 'name', 'available_bikes', 'current_bikes', 'free_racks']
    hub_data = { key: hub[key] for key in keys }

    all_available_bikes_hubs += hub['available_bikes']
    all_current_bikes_hubs += hub['current_bikes']
    hubs_data[hub_data['id']] = hub_data

data_summary[curr_time]['all_available_bikes_hubs'] = all_available_bikes_hubs
data_summary[curr_time]['all_current_bikes_hubs'] = all_current_bikes_hubs

#Bikes data
all_state_not_available = 0
all_repair_state_not_working = 0
all_not_in_hub = 0
all_outside_area = 0
all_rented_bikes = 0

r = requests.get(server + bikes_endpoint, auth=(user, password))
bikes = r.json()['items']
all_available_bikes = r.json()['total_entries']

with open(os.path.join(path_to_output_dir + '/split_data/', all_bikes_data), 'r') as infile:
    all_bike_ids = yaml.load(infile)['bike_ids']

all_bikes_in_system = {}
for bike_id in all_bike_ids:
    all_bikes_in_system[bike_id] = bike_id

unavailable_bikes = all_bikes_in_system.copy()

for bike in bikes:
    keys = ['id', 'name', 'hub_id', 'state', 'repair_state', 'distance', 'inside_area']
    bike_data = { key: bike[key] for key in keys }

    unavailable_bikes.pop(bike['id'], None)

    if bike['hub_id'] == None:
        all_not_in_hub += 1
    if bike['inside_area'] == False:
        all_outside_area += 1
    
    bikes_data[bike_data['id']] = bike_data

rented_bikes_data = {}
unavailable_bikes_data = {}

for bike in unavailable_bikes:
    print bike
    url = server + bike_endpoint%(bike)
    r = requests.get(server + bike_endpoint%(bike), auth=(user, password))
    bike_d = r.json()
    keys = ['id', 'name', 'hub_id', 'state', 'repair_state', 'distance', 'inside_area']
    bike_data = { key: bike_d[key] for key in keys }

    if bike_data['repair_state'] == 'working':
        all_rented_bikes += 1
        bike_data['current_position'] = bike_d['current_position']
        rented_bikes_data[bike] = bike_data
    else:
        all_repair_state_not_working += 1
        unavailable_bikes_data[bike] = bike_data    

data_summary[curr_time]['all_state_not_available'] = all_state_not_available
data_summary[curr_time]['all_repair_state_not_working'] = all_repair_state_not_working
data_summary[curr_time]['all_not_in_hub'] = all_not_in_hub
data_summary[curr_time]['all_available_bikes'] = all_available_bikes
data_summary[curr_time]['all_outside_area'] = all_outside_area
data_summary[curr_time]['all_rented_bikes'] = all_rented_bikes

with open(os.path.join(path_to_output_dir + '/split_data/', data_file_summary), 'a') as outfile:
    yaml.safe_dump(data_summary, outfile, encoding='utf-8', default_flow_style=False, allow_unicode=True)

data_summary[curr_time]['hubs'] = hubs_data
data_summary[curr_time]['bikes'] = bikes_data
data_summary[curr_time]['rented_bikes'] = rented_bikes_data
data_summary[curr_time]['unavailable_bikes'] = unavailable_bikes_data

with open(os.path.join(path_to_output_dir + '/split_data/', data_file), 'a') as outfile:
    yaml.safe_dump(data_summary, outfile, encoding='utf-8', default_flow_style=False, allow_unicode=True)
