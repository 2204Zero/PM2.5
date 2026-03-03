import random 
import time 
import threading 


class SensorNode: 
    def __init__(self, node_id, hub_id): 
        self.id = node_id 
        self.hub_id = hub_id 
        self.battery = 100 
        self.online = True 

    def sample_air(self): 
        if not self.online: 
            return None 

        # simulate battery drain 
        self.battery -= random.uniform(0.1, 0.5) 
        if self.battery <= 5: 
            self.online = False 

        return { 
            "node_id": self.id, 
            "hub_id": self.hub_id, 
            "pm25": random.uniform(20, 200), 
            "timestamp": time.time() 
        } 


class ZoneHub: 
    def __init__(self, hub_id): 
        self.id = hub_id 
        self.received_packets = 0 


class NetworkEngine: 
    def __init__(self): 
        self.nodes = [] 
        self.hubs = [] 
        self.events = [] 
        self.running = False 
        self.thread = None 

        self._initialize_topology() 

    def _initialize_topology(self): 
        # 6 hubs, 4 nodes each 
        for hub_id in range(6): 
            hub = ZoneHub(hub_id) 
            self.hubs.append(hub) 

            for i in range(4): 
                node_id = f"{hub_id}-{i}" 
                node = SensorNode(node_id, hub_id) 
                self.nodes.append(node) 

    def start(self): 
        if self.running: 
            return 
        self.running = True 
        self.thread = threading.Thread(target=self._loop, daemon=True) 
        self.thread.start() 

    def stop(self): 
        self.running = False 

    def _loop(self): 
        while self.running: 
            for node in self.nodes: 
                packet = node.sample_air() 
                if packet: 
                    self.events.append({ 
                        "type": "packet", 
                        "data": packet 
                    }) 
                    # keep last 100 events 
                    if len(self.events) > 100: 
                        self.events.pop(0) 

            time.sleep(2) 

    def get_status(self): 
        return { 
            "running": self.running, 
            "total_nodes": len(self.nodes), 
            "total_hubs": len(self.hubs), 
            "recent_events": self.events[-10:] 
        } 


# singleton instance 
network_engine = NetworkEngine() 
