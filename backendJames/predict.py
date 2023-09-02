
import numpy
import rhino3dm
import torch
import torch.nn as nn
import torch.nn.functional as F
import dgl
from dgl.nn import SAGEConv

import json
import math
import networkx as nx

import matplotlib.pyplot as plt
from flask import Flask
import ghhops_server as hs
from pyngrok import ngrok
import threading

model_path="[enter path to saved trained model]"

# Define the same model class used to train the model
class SAGE(nn.Module):
    def __init__(self, in_feats, hid_feats, out_feats):
        super().__init__()
        self.conv1 = SAGEConv(in_feats=in_feats, out_feats=hid_feats, aggregator_type='mean')
        self.conv2 = SAGEConv(in_feats=hid_feats, out_feats=out_feats, aggregator_type='mean')

    def forward(self, graph, inputs):
        # inputs are features of nodes
        h = self.conv1(graph, inputs)
        h = F.relu(h)
        h = self.conv2(graph, h)
        return h

# Define a function to use the model to evaluate unseen data
def evaluate(graph, device, model):
    model.eval()
    with torch.no_grad():

      features= graph.ndata.pop("attr")
      logits = model(graph, features)
      indices = torch.max(logits, 1)  #equivilant to argmax

    return indices

# Definition that builds the graph from the data received from GH through JSON file passing (node & edges), and uses that to evaluate it to return a prediction from a pre-trained model

#graph classifier
def inductive_node_classifier(nodes,edges):
    #1. BUILD THE GRAPH from the nodes and edges

    #deserialize
    graph_nodes=[]
    for n in nodes:
        graph_nodes.append(json.loads(n))

    graph_edges=[]
    for e in edges:
        graph_edges.append(json.loads(e))

    #Create an edge list for each graph from the edges dataframe
    graph_edge_list=[[graph_edges[i][0], graph_edges[i][1]] for i in range(len(graph_edges))]  #Notice that the incident nodes must be the first two elements of each list


    #Build the Graph
    bldg_g=nx.Graph()
    bldg_g.add_nodes_from(range(len(graph_nodes)))
    bldg_g.add_edges_from(graph_edge_list)

    #2. Add nodes features (create dictionaries)

    betweenness=nx.betweenness_centrality(bldg_g)
    betweenness=[ list(betweenness.items())[i][1] for i in range(len(list(betweenness.items())))] #get the dictionary values not the keys

    closeness=nx.closeness_centrality(bldg_g)
    closeness=[ list(closeness.items())[i][1] for i in range(len(list(closeness.items())))] #get the dictionary values not the keys

    #we have 5 node feature, *****Please notice that we are using x,y,z as features in this example, in your case if they are not node features don't add them
    x_dict={}
    y_dict={}
    z_dict={}
    degree_dict={}
    betweenness_dic={}
    closeness_dic={}

    for i,n in enumerate(graph_nodes):
        x_dict[i]=n[0]
        y_dict[i]=n[1]
        z_dict[i]=n[2]
        degree_dict[i]=n[4]
    for i in bldg_g.nodes():
      closeness_dic[i]=closeness[i]
    for i in bldg_g.nodes():
      betweenness_dic[i]=betweenness[i]


    nx.set_node_attributes(bldg_g,x_dict,'x')
    nx.set_node_attributes(bldg_g,y_dict,'y')
    nx.set_node_attributes(bldg_g,z_dict,'z')
    nx.set_node_attributes(bldg_g,degree_dict ,'degree')
    nx.set_node_attributes(bldg_g,closeness_dic ,'closeness')
    nx.set_node_attributes(bldg_g,betweenness_dic ,'betweenness')

    #add shortest path
    filtered_edges = []
    recognized_units_indicies=[]

    # Filter units according to degree
    for i, d in zip(nx.get_node_attributes(bldg_g, 'degree').keys(), nx.get_node_attributes(bldg_g, 'degree').values()):
        if d == 1:
            recognized_units_indicies.append(i)

    # Filter egress according to node's positions
    ##################
    # Needs revision when we don't feed in Vertical Edges
    ##################
    for e in bldg_g.edges():
        start_node, end_node = e
        start_node_attrs = {
            'x': nx.get_node_attributes(bldg_g, 'x')[start_node],
            'y': nx.get_node_attributes(bldg_g, 'y')[start_node],
            'z': nx.get_node_attributes(bldg_g, 'z')[start_node]
        }
        end_node_attrs = {
            'x': nx.get_node_attributes(bldg_g, 'x')[end_node],
            'y': nx.get_node_attributes(bldg_g, 'y')[end_node],
            'z': nx.get_node_attributes(bldg_g, 'z')[end_node]
        }

        # Check if the x and y coordinates are the same but z is different
        if start_node_attrs['x'] == end_node_attrs['x'] and \
            start_node_attrs['y'] == end_node_attrs['y'] and \
            start_node_attrs['z'] != end_node_attrs['z']:
            filtered_edges.append(start_node)
            filtered_edges.append(end_node)

    egress_nodes=recognized_units_indicies
    unit_nodes=filtered_edges
    corridor_nodes=[]
    for n in bldg_g.nodes():
      if n not in egress_nodes and n not in unit_nodes:
        corridor_nodes.append(n)


    all_shortest_paths_egress_dic = {}
    all_shortest_paths_unit_dic = {}
    all_shortest_paths_corridor_dic = {}
    source_egress_sum = []
    source_unit_sum = []

    for source in egress_nodes:
      source_egress_sum = 0  # Initialize sum to zero for this source
      for target in unit_nodes:
        if nx.has_path(bldg_g, source, target):  # Make sure there is a path
          # all_shortest_path_length = nx.shortest_path_length(g, source, target, weight='feature_1')
          source_egress_sum += nx.shortest_path_length(bldg_g, source, target, weight='feature_1')
      all_shortest_paths_egress_dic[(source)] = source_egress_sum  # Save summed path length using (source) as the key

    for source in unit_nodes:
      source_unit_sum = 0  # Initialize sum to zero for this source
      for target in egress_nodes:
        if nx.has_path(bldg_g, source, target):
          # all_shortest_path_length = nx.shortest_path_length(g, source, target, weight='feature_1')
          source_unit_sum += nx.shortest_path_length(bldg_g, source, target, weight='feature_1')  #length
      all_shortest_paths_unit_dic[(source)] = source_unit_sum # Save summed path length using (source) as the key

    for c in corridor_nodes:
      all_shortest_paths_corridor_dic[(c)] = 0 # Save zero path length using (source) as the key

    nx.set_node_attributes(bldg_g, all_shortest_paths_egress_dic, "shortest_paths")
    nx.set_node_attributes(bldg_g, all_shortest_paths_unit_dic, "shortest_paths")
    nx.set_node_attributes(bldg_g, all_shortest_paths_corridor_dic, "shortest_paths")


    #4. Convert to a dgl graph and add both the nodes attributes and edges weight
    b_g_dgl=dgl.from_networkx(bldg_g, node_attrs=['x','y','z','degree','closeness','betweenness','shortest_paths'])

    #add all node features to one tensor "attr"
    b_g_dgl.ndata["x"]=torch.reshape(b_g_dgl.ndata["x"],(b_g_dgl.ndata["x"].shape[0],1))
    b_g_dgl.ndata["y"]=torch.reshape(b_g_dgl.ndata["y"],(b_g_dgl.ndata["y"].shape[0],1))
    b_g_dgl.ndata["z"]=torch.reshape(b_g_dgl.ndata["z"],(b_g_dgl.ndata["z"].shape[0],1))
    b_g_dgl.ndata["degree"]=torch.reshape(b_g_dgl.ndata["degree"],(b_g_dgl.ndata["degree"].shape[0],1))
    b_g_dgl.ndata["closeness"]=torch.reshape(b_g_dgl.ndata["closeness"],(b_g_dgl.ndata["closeness"].shape[0],1))
    b_g_dgl.ndata["betweenness"]=torch.reshape(b_g_dgl.ndata["betweenness"],(b_g_dgl.ndata["betweenness"].shape[0],1))
    b_g_dgl.ndata["shortest_paths"]=torch.reshape(b_g_dgl.ndata["shortest_paths"],(b_g_dgl.ndata["shortest_paths"].shape[0],1))
    b_g_dgl.ndata["attr"]=torch.cat([b_g_dgl.ndata["degree"] , b_g_dgl.ndata["closeness"], b_g_dgl.ndata["betweenness"], b_g_dgl.ndata["shortest_paths"] ],1)
    b_g_dgl.ndata["attr"]=b_g_dgl.ndata["attr"].type(torch.float32)


    #5. Predict the node class
    n_features=b_g_dgl.ndata['attr'].shape[1]
    n_hidden=7 #depends on what you used in the model
    n_classes=3

    loaded_model=SAGE(n_features, n_hidden, n_classes)
    loaded_model.load_state_dict(torch.load(model_path))

    device='cpu'
    predicted_class=evaluate(b_g_dgl,device,loaded_model)

    predicted_class_new=[]
    for i in list(predicted_class):
      predicted_class_new.append(str(i.item()))

    #predicted_class_new=json.dump(list(predicted_class))
    #print(predicted_class)

    return predicted_class_new

def node_classifier(nodes,edges):

    return inductive_node_classifier(nodes,edges)