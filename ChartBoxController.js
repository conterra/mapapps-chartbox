/*
 * Copyright (C) 2015 con terra GmbH (info@conterra.de)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define(
    ["dojo/_base/declare",
        "ct/_Connect",
        "ct/store/Filter",
        "ct/_when"
    ],
    function(declare, _Connect, Filter, ct_when) {
        return declare(
            [], {
                activate: function() {
                    var listeners = this._listeners = new _Connect();
                    listeners.connect(this.chartbox, "onTriggerFilterChange", this, this._changeFilter);
                    listeners.connect(this.chartbox, "onUrlChanged", this, this.createNewStore);
                    listeners.connect(this.chartbox, "onApplyChanges", this, this.changeDataSet);
                    listeners.connect(this.chartbox, "onReset", this, this._changeFilter)
                    listeners.connect(this.chartbox, "onAddDatafFromResultCenter", this, this.getStoreData)

                },
                createNewStore: function(url) {
                    var store = this.MapServerLayerStoreFactory.createStore(url);
                    this.store = store;
                    store.target = url;
                    this.getStoreMetadata()
                    var query = {}
                    var filter = Filter(this.store, query);
                    var resultCenterDataModel = this.resultCenterDataModel;
                    resultCenterDataModel.setDatasource(filter);
                    resultCenterDataModel.fireDataChanged();
                },
                changeDataSet: function(chartUrl, xValue, xValue2, xValue3, xName, yValue, yValue2, yName, yName2, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName, chartType, onlyUseResultCenterData) {
                    var query = {}
                    var mappings = {}
                    var dataset = {
                        "url": chartUrl,
                        "mappings": mappings
                    };
                    //			    Check Charttype then structure mappings accordingly. ToDo: Add query for grouped, scatter, bubble (but first check if that makes sense)! 
                    if (chartType === "bar" || chartType === "bar-horizontal") {
                        mappings.y = {
                            "field": yValue,
                            "label": yName
                        };
                        mappings.x = {
                            "field": xValue,
                            "label": xName
                        };
                        if (queryGroupField != undefined || queryGroupField != "") {
                            query = {
                                "groupByFieldsForStatistics": queryGroupField,
                                "outStatistics": [{
                                    "statisticType": queryStatisticalOperator,
                                    "onStatisticField": queryFieldToCalculate,
                                    "outStatisticFieldName": queryNewFieldName
                                }]
                            }
                        }
                    } else if (chartType === "grouped") {
                        mappings.x = {
                            "field": ["attributes." + xValue, "attributes." + xValue2, "attributes." + xValue3],
                            "label": xName
                        }
                        mappings.group = {
                            "field": yValue,
                            "label": yName
                        }
                        if (queryGroupField != undefined || queryGroupField != "") {
                            query = {
                                "groupByFieldsForStatistics": queryGroupField,
                                "outStatistics": [{
                                    "statisticType": queryStatisticalOperator,
                                    "onStatisticField": queryFieldToCalculate,
                                    "outStatisticFieldName": queryNewFieldName
                                }]
                            }
                        }
                    } else if (chartType === "scatter") {
                        mappings.y = {
                            "field": yValue,
                            "label": yName
                        };
                        mappings.x = {
                            "field": xValue,
                            "label": xName
                        };
                        if (queryGroupField != undefined || queryGroupField != "") {
                            query = {
                                "groupByFieldsForStatistics": queryGroupField,
                                "outStatistics": [{
                                    "statisticType": queryStatisticalOperator,
                                    "onStatisticField": queryFieldToCalculate,
                                    "outStatisticFieldName": queryNewFieldName
                                }],
                                "outFields": [xValue, yValue, yValue2]
                            }
                        } else {
                            query = {}
                        }
                        mappings.color = {
                            "field": yValue2,
                            "label": yName2
                        };
                    } else if (chartType === "bubble") {
                        mappings.y = {
                            "field": yValue,
                            "label": yName
                        };
                        mappings.x = {
                            "field": xValue,
                            "label": xName
                        };
                        query = {};
                        mappings.size = {
                            "field": yValue2,
                            "label": yName2
                        };
                    } else if (chartType === "pie") {
                        mappings.label = {
                            "field": xValue,
                            "label": xName
                        };
                        mappings.y = {
                            "field": yValue,
                            "label": yName
                        };
                        if (queryGroupField != undefined || queryGroupField != "") {
                            query = {
                                "groupByFieldsForStatistics": queryGroupField,
                                "outStatistics": [{
                                    "statisticType": queryStatisticalOperator,
                                    "onStatisticField": queryFieldToCalculate,
                                    "outStatisticFieldName": queryNewFieldName
                                }]
                            }
                        }
                    } else if (chartType === "time") {
                        mappings.time = {
                            "field": xValue,
                            "label": xName
                        };
                        mappings.value = {
                            "field": yValue,
                            "label": yName
                        };
                        mappings.sort = xValue;
                        if (queryGroupField != undefined || queryGroupField != "") {
                            query = {
                                "groupByFieldsForStatistics": queryGroupField,
                                "outStatistics": [{
                                    "statisticType": queryStatisticalOperator,
                                    "onStatisticField": queryFieldToCalculate,
                                    "outStatisticFieldName": queryNewFieldName
                                }]
                            }
                        }
                    };

                    if (xValue.slice(-4) == "_NEW" || xValue2.slice(-4) == "_NEW" || xValue3.slice(-4) == "_NEW" || yValue.slice(-4) == "_NEW" || yValue2.slice(-4) == "_NEW") {
                        dataset.query = query
                    }

                    if (onlyUseResultCenterData == "agreed") {
                        var that = this
                        var dataModel = this.resultCenterDataModel
                        var data = dataModel.getSelected();
                        var promise = ct_when(data, function(data) {
                            if (data.length > 0) {
                                var objectIDs = data.toString();
                                if (!dataset.query) {
                                    dataset.query = {}
                                }
                                dataset.query.where = "OBJECTID in " + "(" + objectIDs + ")"
                                that.chartbox.updateChart(dataset);
                            } else {
                                throw "Error: No Data Selected"
                            }

                        })
                    } else {
                        this.chartbox.updateChart(dataset);
                    }
                    this.createTooltip(xValue, xValue2, xValue3, yValue, yValue2);

                    // Code for using data from Result Center for charts ToDo: Export in new Method and call Method when triggered by User ("useDataFromResultCenter")
                    if (dataset.url == undefined || dataset.url == null || dataset.url == "") {
                        var queryGroupField = queryGroupField
                        var queryStatisticalOperator = queryStatisticalOperator
                        var queryFieldToCalculate = queryFieldToCalculate
                        var queryNewFieldName = queryNewFieldName
                        var that = this
                        var query = {}
                        var dataModel = this.resultCenterDataModel
                        var data = dataModel.query(query);
                        var promise = ct_when(data, function(data) {
                            setData(data, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName);
                        })

                        function setData(data, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName) {
                            data.forEach(function(element, index,
                                array) {
                                var propertyNames = Object
                                    .keys(element)
                                element.attributes = {}
                                for (var i = 0; i < propertyNames.length; i++) {
                                    element.attributes[propertyNames[i]] = data[index][propertyNames[i]]
                                }
                                for (x in element) {
                                    if (x != "attributes") {
                                        delete element[x]
                                    }
                                }
                            })
                            var data = {
                                "features": data
                            }
                            if (queryGroupField != undefined) {
                                that.transformDataForQuery(data, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName)
                            }
                            dataset.data = data
                            that.chartbox.updateChart(dataset)
                        }
                    }
                },
                //Transform Data to achieve query functionality similar to ArcGIS Feature Server Query(necessary because resultCenterDataModel.query doesn't support creating new Fields using query) 
                transformDataForQuery: function(data, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName) {
                    var result = {}
                    data.features.forEach(function(element, index, array) {
                        var attributes = element.attributes
                        var newField = attributes[queryGroupField]
                        if (!result[newField]) {
                            result[newField] = 0
                        }
                        for (var x in attributes) {
                            if (x == queryFieldToCalculate) {
                                result[attributes[queryGroupField]] += attributes[x]
                            }
                        }
                    })
                },
                createTooltip: function(xValue, xValue2, xValue3, yValue, yValue2) {
                    this.chartbox.updateTooltip(xValue, xValue2, xValue3, yValue, yValue2)
                },
                getStoreMetadata: function() {
                    var that = this
                    var metadataDef = this.store.getMetadata();
                    var promise = ct_when(metadataDef, function(metadataDef) {
                        that.chartbox.populateFields(that.store.getMetadata())
                        
                    })
                },
                _changeFilter: function(queryfield, selected, queryfield2, selected2) {
                    var query = {}
                    if (queryfield && selected) {
                        query[queryfield] = selected;
                        if (queryfield2 != undefined || selected2 != undefined) {
                            query[queryfield2] = selected2;
                        }
                    }
                    var filter = Filter(this.store, query);
                    var resultCenterDataModel = this.resultCenterDataModel;
                    resultCenterDataModel.setDatasource(filter);
                    resultCenterDataModel.fireDataChanged();
                },
                getStoreData: function() {
                    var that = this
                    var query = {}
                    var dataModel = this.resultCenterDataModel
                    var data = dataModel.query(query);
                    var promise = ct_when(data, function(data) {
                        that.chartbox.processDataFromResultCenter(data);
                    })
                },
                deactivate: function(){
                    
                }
            });
    });
