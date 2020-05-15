//
//  MapperRegistry.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 20/03/2020.
//

#include "MapperRegistry.h"

#include <map>
#include <array>
#include <set>

#include "Mapper.h"

namespace reanimated {

void MapperRegistry::startMapper(std::shared_ptr<Mapper> mapper) {
  mappers[mapper->id] = mapper;
  updatedSinceLastExecute = true;
}

void MapperRegistry::stopMapper(unsigned long id) {
  mappers.erase(id);
  updatedSinceLastExecute = true;
}

void MapperRegistry::execute(jsi::Runtime &rt) {
  if (updatedSinceLastExecute) {
    updateOrder();
    updatedSinceLastExecute = false;
  }
  for (auto & mapper : sortedMappers) {
    if (mapper->dirty) {
      mapper->execute(rt);
    }
  }
}

enum node {
  MAPPER = 0,
  SHARED_VALUE,
};

bool MapperRegistry::needRunOnRender() {
  return updatedSinceLastExecute; // TODO: also run if input nodes are dirty
}

void MapperRegistry::updateOrder() { // Topological sorting
  sortedMappers.clear();
  for (auto mapper : mappers) {
    sortedMappers.push_back(mapper.second);
  }
//  
//  std::map<std::pair<int,int>, int> deg;
//  
//  std::map<int, std::vector<int>> mappersThatUse;
//  
//  std::set<std::pair<int, std::pair<int,int>>> nodes;
//  
//  std::function<void(std::pair<int,int>)> update = [&] (std::pair<int,int> id) {
//    auto entry = std::make_pair(deg[id], id);
//    if (nodes.find(entry) == nodes.end()) return;
//    nodes.erase(entry);
//    entry.first--;
//    deg[id]--;
//    nodes.insert(entry);
//  };
//  
//  for (auto & entry : mappers) {
//    std::pair<int,int> id = std::make_pair(MAPPER, entry.first);
//    auto & mapper = entry.second;
//    deg[id] = mapper->inputIds.size();
//    nodes.insert(std::make_pair(deg[id], id));
//    
//    for (auto inId : mapper->inputIds) {
//      mappersThatUse[inId].push_back(mapper->id);
//      auto id = std::make_pair(SHARED_VALUE, inId);
//      if (deg.count(id) == 0) {
//        deg[id] = 0;
//      }
//    }
//    
//    for (auto outId : mapper->outputIds) {
//      deg[std::make_pair(SHARED_VALUE, outId)]++;
//    }
//  }
//  
//  for (auto & entry : deg) {
//    auto id = entry.first;
//    if (id.first == SHARED_VALUE) {
//      nodes.insert(std::make_pair(entry.second, id));
//    }
//  }
//  
//  while (nodes.size() > 0 and nodes.begin()->first == 0) {
//    auto entry = *nodes.begin();
//    nodes.erase(entry);
//    
//    auto id = entry.second;
//    std::vector<std::pair<int,int>> toUpdate;
//    
//    if (id.first == SHARED_VALUE) {
//      for (int id : mappersThatUse[id.second]) {
//        toUpdate.push_back(std::make_pair(MAPPER, id));
//      }
//    } else {
//      for (int id : mappers[id.second]->outputIds) {
//        toUpdate.push_back(std::make_pair(SHARED_VALUE, id));
//      }
//      
//      sortedMappers.push_back(mappers[id.second]);
//    }
//    
//    for (auto & id : toUpdate) update(id);
//  }
//  
//  if (nodes.size() > 0) {
//    throw std::runtime_error("Cycle in mappers graph!");
//  }
}

}
