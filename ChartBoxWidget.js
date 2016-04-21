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
define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    // "dojo/text!./templates/ChartBoxWidget.html",
    "dojo/text!./templates/BootsTrapStyle/ChartBoxWidget.html",
    "d3",
    "cedar",
    "vega",
    "dijit/form/Select",
    "dojo/dom",
    "ct/ui/desktop/util",
    "dojo/dom-construct",
    "dojo/fx/Toggler",
    "dojo/mouse",
    "dojo/on",
    'dojo/_base/fx',
    "dojo/dom-style",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/layers/FeatureLayer",
    "esri/tasks/StatisticDefinition",
    "dojo/store/Memory",
    "dojo/text!./NewDataTestFile.json",
    "dojo/json",
    "dojo/_base/xhr",
    "dojo/when",
    "dojo/query",
    "ct/_Connect",
    "dojo/domReady!"
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, templateStringContent, D3, Cedar, Vega, Select, dom, ct_util, domConstruct, Toggler, mouse, on, fx, domStyle, Query, QueryTask, FeatureLayer, StatisticDefinition, Memory, JsonContent, JSON, xhr, when, dojoQuery, _Connect) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: templateStringContent,
        startup: function() {   
            this.checkChartType();
            this.toggleQuery();
            this.toggleWhere();
            this.fillLayerStore();
            var that = this
            var listener = this.listener = new _Connect();
            listener.connect(this.SaveChartFactory, "onWindowClose", this, function() {
                that.chart.show({
                    elementId: "#" + this.id + "chart"
                })
            })
        },
        updateChart: function(dataset) {
            var that = this;
            this.dataset = dataset
            var chartType = this.chartSelect.get("value")
            this.updateChart.chartType = chartType
            var chart = this.chart = new Cedar({
                "type": chartType,
                "dataset": dataset
            })
            if (chartType != "pie") {
                //pie charts dont have axes
        	//ToDo change dy/dx to titleOffset
                chart.override = {
                    "axes": [{
                        "titleOffset": {
                            "value": 50
                        },
                        "properties": {
                            "title": {
                                "fontSize": {
                                    "value": 15
                                },
                                "dy": {
                                    "value": 95
                                }
                            }
                        }
                    }, {
                        "properties": {
                            "title": {
                                "fontSize": {
                                    "value": 15
                                },
                                "dy": {
                                    "value": -70
                                }
                            }
                        }
                    }]
                }
            } else {
                chart.dataset.mappings.radius = 200
            };
            chart.show({
                elementId: "#" + this.id + "chart",
                height: 500,
                width: 750
            });
            if (chartType === "bar" || chartType === "bar-horizontal" || chartType === "pie") {
                this.sort()
            }
            // MouseOver Function: clicked Data is sent to Result Center and set as new Filter:
            chart.on('mouseover', function(event, item) {
                if (item === undefined || item === null) {
                    console.log("item is null.");
                    return;
                }
                var event = event
                var item = item
                if (chartType === "bar") {
                    var selected = item[dataset.mappings.x.field];
                    var queryfield = dataset.mappings.x.field;
                    that.onTriggerFilterChange(queryfield, selected)
                } else if (chartType === "bar-horizontal") {
                    var selected = item[dataset.mappings.y.field];
                    var queryfield = dataset.mappings.y.field;
                    that.onTriggerFilterChange(queryfield, selected)
                } else if (chartType === "grouped") {
                    var selected = item[dataset.mappings.x.field[0].substr(11)];
                    var queryfield = dataset.mappings.x.field[0].substr(11);
                    that.onTriggerFilterChange(queryfield, selected)
                } else if (chartType === "scatter" || chartType === "bubble") {
                    var selected = item[dataset.mappings.x.field];
                    var queryfield = dataset.mappings.x.field;
                    var selected2 = item[dataset.mappings.y.field]
                    var queryfield2 = dataset.mappings.y.field
                    that.onTriggerFilterChange(queryfield, selected, queryfield2, selected2)
                } else if (chartType === "pie") {
                    var selected = item[dataset.mappings.label.field];
                    var queryfield = dataset.mappings.label.field;
                    that.onTriggerFilterChange(queryfield, selected)
                }
            })
            // Mouseout Function: Reset Filter
            chart.on('mouseout', function(event, item) {
                that.onReset()
            })
            // onClick Function: Clicked Data is drilled down to a sub category using optional subtype input. Subtype is then set as new X-Axis Value (e.G. Value:Country Subtype:State) ToDo: 2 things happening when Data is clicked & only works for Bar
            chart.on('click', function(event, item) {
                if (item === undefined || item === null) {
                    console.log("item is null.");
                    return;
                }
                if (chartType == "bar") {
                    var selected = item[dataset.mappings.x.field];
                    var queryfield = dataset.mappings.x.field
                    var where = queryfield + " = '" + selected + "'"
                    chart.dataset.query.where = where
                    chart.dataset.query.groupByFieldsForStatistics = that.xAxisValue2.get("value")
                    chart.dataset.mappings.x.field = that.xAxisValue2.get("value")
                    chart.update()
                } else if (chartType == "pie") {
                    var selected = item[dataset.mappings.label.field];
                    var queryfield = dataset.mappings.label.field
                    var where = queryfield + " = '" + selected + "'"
                    chart.dataset.query.where = where
                    chart.dataset.query.groupByFieldsForStatistics = that.xAxisValue2.get("value")
                    chart.dataset.mappings.label.field = that.xAxisValue2.get("value")
                    chart.update()
                } else if (chartType == "bar-horizontal") {
                    var selected = item[dataset.mappings.y.field];
                    var queryfield = dataset.mappings.y.field
                    var where = queryfield + " = '" + selected + "'"
                    chart.dataset.query.where = where
                    chart.dataset.query.groupByFieldsForStatistics = that.yAxisValue2.get("value")
                    chart.dataset.mappings.y.field = that.yAxisValue2.get("value")
                    chart.update()
                }
            });
            // onDoubleClick Function: Chart is redrawn with initial mappings. (Note: not the same as chart.update() which uses mappings as is)
            chart.on('dblclick', function(event, item) {
                that.applyChanges()
                that.onReset()
            })
            if (chart) {
                domStyle.set(dom.byId("chartControls"), "display", "inline");
            }
            // call where method if user has defined a Filter	  
            if (this.whereCheckBox.get("value") == "agreed" && this.whereQueryField.get("value") != undefined && this.whereCondition.get("displayedValue") != undefined) {
                this.where()
            }
        },
        // "where" functionality using ArcGIS JS API's query task. Query object is then appended to global chart.dataset object.
        where: function() {
            var url
            if (this.urlTextBox.item != null) {
                url = this.urlTextBox.item.value
            } else {
                url = this.urlTextBox.get("value")
            }
            var featureLayer = new FeatureLayer(url)
            var that = this
            var queryField = this.whereQueryField.get("value")
            var expression = this.whereExpression.get("value")
            var condition = this.whereCondition.get("displayedValue")
            var where = queryField + expression + "'" + condition + "'"
            if (!featureLayer.getField(queryField)) {
                if (that.queryFieldsArray && queryField == that.queryFieldsArray[0].queryNewFieldName) {
                    var queryGroupField = that.queryFieldsArray[0].queryGroupField
                    var statType = that.queryFieldsArray[0].queryStatisticalOperator
                    var onStatField = that.queryFieldsArray[0].queryFieldToCalculate
                    var outStatName = that.queryFieldsArray[0].queryNewFieldName
                    var query = new Query()
                    query.where = queryGroupField + " > " + "'0'"
                    query.returnGeometry = false;
                    var statisticDefinition = new StatisticDefinition();
                    statisticDefinition.statisticType = statType
                    statisticDefinition.onStatisticField = onStatField
                    statisticDefinition.outStatisticFieldName = outStatName
                    query.outStatistics = [statisticDefinition]
                    query.groupByFieldsForStatistics = [queryGroupField]
                    var newWhere = ""
                    var queryTask = new QueryTask(url)
                    queryTask.execute(query, function(results) {
                        for (var i = 0; i < results.features.length; i++) {
                            if (expression == "=") {
                                if (results.features[i].attributes[outStatName] = condition) {
                                    newWhere += queryGroupField + "=" + "'" + results.features[i].attributes[queryGroupField] + "'" + " OR "
                                }
                            } else if (expression == "!=") {
                                if (results.features[i].attributes[outStatName] != condition) {
                                    newWhere += queryGroupField + "=" + "'" + results.features[i].attributes[queryGroupField] + "'" + " OR "
                                }
                            } else if (expression == ">") {
                                if (results.features[i].attributes[outStatName] > condition) {
                                    newWhere += queryGroupField + "=" + "'" + results.features[i].attributes[queryGroupField] + "'" + " OR "
                                }
                            } else if (expression == "<") {
                                if (results.features[i].attributes[outStatName] > condition) {
                                    newWhere += queryGroupField + "=" + "'" + results.features[i].attributes[queryGroupField] + "'" + " OR "
                                }
                            }
                        }
                        var newWhereSliced = newWhere.slice(0, -4)

                        if (that.chart.dataset.query.where == "1=1" || that.chart.dataset.query.where == undefined) {
                            that.chart.dataset.query.where = newWhereSliced
                            that.chart.update()
                        } else {
                            that.chart.dataset.query.where = that.chart.dataset.query.where + "AND " + newWhereSliced
                        }
                    })
                } else {
                    if (that.chart.dataset.query.where == "1=1" || that.chart.dataset.query.where == undefined) {
                        that.chart.dataset.query.where = where
                        that.chart.update()
                    } else {
                        that.chart.dataset.query.where = that.chart.dataset.query.where + "AND " + where
                    }
                }
            }
        },
        // creates/updates the chart's tooltip toDo: change Name of Tooltip Field if Field is created by user (e.g. XYZ_NEW ---> Total Number of Students)
        updateTooltip: function(xValue, xValue2, xValue3, yValue, yValue2) {
            var chartType = this.updateChart.chartType
            this.chart.tooltip = {}
            if (this.chart) {
                if (chartType === "bar" || chartType === "pie" || chartType === "time") {
                    this.chart.tooltip = {
                        "title": "{" + xValue + "}",
                        "content": yValue + ": " + '{' + yValue + '}'
                    }
                } else if (chartType === "bar-horizontal") {
                    this.chart.tooltip = {
                        "title": "{" + yValue + "}",
                        "content": xValue + ": " + '{' + xValue + '}'
                    }

                } else if (chartType === "grouped") {
                    this.chart.tooltip = {
                        "title": "{" + yValue + "}",
                        "content": xValue + ":" + '{' + xValue + '} ' + xValue2 + ": " + '{' + xValue2 + '} ' + xValue3 + ": " + '{' + xValue3 + '}'
                    }
                } else if (chartType === "scatter" || chartType === "bubble") {
                    this.chart.tooltip = {
                        "title": 'ObjectID:{OBJECTID}',
                        "content": xValue + ":" + '{' + xValue + '} ' + yValue + ": " + '{' + yValue + '}'
                    }
                }
            }
        },
        // central method to populate value fields with values from feature layer fields 
        populateFields: function(metadata) {
            var that = this;
            var metadata = metadata
            var fields = []
            if (Array.isArray(metadata)) {
                for (var x in metadata[0].attributes) {
                    fields.push({
                        "name": x
                    })
                }
            } else {
                fields = metadata.fields;
            }
            this.xAxisValue.set({
                options: []
            })
            for (var i = 0; i < fields.length; i++) {
                that.xAxisValue.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.yAxisValue.set({
                options: []
            });
            for (var i = 0; i < fields.length; i++) {
                that.yAxisValue.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.queryGroupField.set({
                options: []
            });
            for (var i = 0; i < fields.length; i++) {
                that.queryGroupField.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.queryFieldToCalculate.set({
                options: []
            });
            for (var i = 0; i < fields.length; i++) {
                that.queryFieldToCalculate.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.xAxisValue2.set({
                options: []
            })
            for (var i = 0; i < fields.length; i++) {
                that.xAxisValue2.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.xAxisValue3.set({
                options: []
            })
            for (var i = 0; i < fields.length; i++) {
                that.xAxisValue3.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.yAxisValue2.set({
                options: []
            })
            for (var i = 0; i < fields.length; i++) {
                that.yAxisValue2.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
            this.whereQueryField.set({
                options: []
            })
            for (var i = 0; i < fields.length; i++) {
                that.whereQueryField.addOption({
                    label: fields[i].name,
                    value: fields[i].name
                })
            };
        },
        // fetches the field to be used by for "where" query and passes the corresponding values to the condition store created in the template.
        populateWhereCondition: function() {
            var queryField = this.whereQueryField.get("value")
            var query = new Query()
            query.where = queryField + " > " + "'0'"
            query.outFields = [queryField]
            var url
            if (this.urlTextBox.item != null) {
                url = this.urlTextBox.item.value
            } else {
                url = this.urlTextBox.get("value")
            }
            var queryTask = new QueryTask(url)
            var that = this
            var data = []
            this.conditionStore.setData(data)
            queryTask.execute(query, function(results) {
                for (var i = 0; i < results.features.length; i++) {
                    var value = results.features[i].attributes[queryField]
                    if (!that.conditionStore.get(value)) {
                        that.conditionStore.put({
                            name: value,
                            id: value
                        })
                    }
                }
            })
        },
        // sorts the data on hierarchically toDo: Add sorting function for all chart types
        // make numbered fields sortable (e.g. ObjectIds)
        sort: function() {
            var that = this
            if (this.chart) {
                var selected = this.sortSelect.get("value");
                var fieldToSort
                if (this.chartSelect.get("value") == "bar" || this.chartSelect.get("value") == "pie") {
                    fieldToSort = this.chart.dataset.mappings.y.field
                } else if (this.chartSelect.get("value") == "bar-horizontal" || this.chartSelect.get("value") == "grouped") {
                    fieldToSort = this.chart.dataset.mappings.x.field
                }
                if (selected !== "NONE") {
                    this.chart.dataset.mappings.sort = fieldToSort + " " + selected
                    this.chart.update()
                }
            }
        },
        // creates a query field using ArcGIS Feature Service SQL and adds this field to mapping option (X-Axis-Value column, Y-Axis-Value columnn). Fade in / Fade out animation to signify that field is added
        addQueryField: function() {
            var queryGroupField = this.queryGroupField.get("value");
            var queryStatisticalOperator = this.queryStatisticalOperator.get("value");
            var queryFieldToCalculate = this.queryFieldToCalculate.get("value");
            var queryNewFieldName = this.queryNewFieldName.get("value") + "_NEW";
            var that = this;
            if (!this.queryFieldsArray) {
                var queryFieldsArray = new Array()
                this.queryFieldsArray = queryFieldsArray
            }
            that.xAxisValue.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            that.xAxisValue2.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            that.xAxisValue3.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            that.yAxisValue.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            that.yAxisValue2.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            that.whereQueryField.addOption({
                label: queryNewFieldName,
                value: queryNewFieldName
            })
            this.queryFieldsArray.push({
                "queryGroupField": queryGroupField,
                "queryStatisticalOperator": queryStatisticalOperator,
                "queryFieldToCalculate": queryFieldToCalculate,
                "queryNewFieldName": queryNewFieldName
            })
        },
        // Test Code for adding JSON files as data input
        addData: function() {
            var that = this
            var jsonData
            var parseJson = xhr.get({
                url: "js/bundles/chartbox/NewDataTestFile.json",
                handleAs: "json",
                load: function(data) {
                    jsonData = data
                }
            })
            when(parseJson, function() {
                var newChart = new Cedar({
                    "type": "bar"
                });
                var dataset = {
                    "data": jsonData,
                    "mappings": {
                        "x": {
                            "field": "ZIP_CODE",
                            "label": "ZIP Code"
                        },
                        "y": {
                            "field": "TOTAL_STUD_SUM",
                            "label": "Total Students"
                        }
                    }
                };
                newChart.dataset = dataset;
                newChart.show({
                    elementId: "#" + that.id + "chart",
                    renderer: "svg",
                    autolabels: true
                });
            })
        },
        // restructures data from datamodel to fit in .populateFields method
        processDataFromResultCenter: function(data) {
            data.forEach(function(element, index, array) {
                var propertyNames = Object.keys(element)
                element.attributes = {}
                for (var i = 0; i < data.length; i++) {
                    if (data[i][propertyNames[i]] != null && data[i][propertyNames[i]] != undefined) {
                        element.attributes[propertyNames[i]] = data[i][propertyNames[i]]
                    }
                }
            })
            this.populateFields(data)
        },
        // listener function
        urlChanged: function() {
            if (this.urlTextBox.item != null) {
                var url = this.urlTextBox.item.value
            } else {
                var url = this.urlTextBox.get("value")
            }
            this.onUrlChanged(url)
        },
        //function to pass data to Controller class
        applyChanges: function() {
            var chartUrl
            if (this.urlTextBox.item != null) {
                chartUrl = this.urlTextBox.item.value
            } else {
                chartUrl = this.urlTextBox.get("value")
            }
            var xValue = this.xAxisValue.get("value");
            var xValue2 = this.xAxisValue2.get("value");
            var xValue3 = this.xAxisValue3.get("value");
            var xName = this.xAxisName.get("value");
            var yValue = this.yAxisValue.get("value");
            var yName = this.yAxisName.get("value");
            var yValue2 = this.yAxisValue2.get("value");
            var yName2 = this.yAxisName2.get("value");
            var onlyUseResultCenterData = this.onlyUseResultCenterData.get("value")
            var queryGroupField
            var queryStatisticalOperator
            var queryFieldToCalculate
            var queryNewFieldName
            var chartType = this.chartSelect.get("value")
            if (this.queryFieldsArray) {
                var queryFields = this.queryFieldsArray
                if (this.updateChart.chartType == "bar" || this.updateChart.chartType == "bar-horizontal" || this.updateChart.chartType == "pie" || this.updateChart.chartType == "scatter" || this.updateChart.chartType == "scatter") {
                    for (var i = 0; i < queryFields.length; i++) {
                        if (xValue == queryFields[i].queryNewFieldName) {
                            queryGroupField = queryFields[i].queryGroupField
                            queryStatisticalOperator = queryFields[i].queryStatisticalOperator
                            queryFieldToCalculate = queryFields[i].queryFieldToCalculate
                            queryNewFieldName = queryFields[i].queryNewFieldName
                        }
                    };
                    if (queryGroupField == undefined) {
                        for (var i = 0; i < queryFields.length; i++) {
                            if (yValue == queryFields[i].queryNewFieldName) {
                                queryGroupField = queryFields[i].queryGroupField
                                queryStatisticalOperator = queryFields[i].queryStatisticalOperator
                                queryFieldToCalculate = queryFields[i].queryFieldToCalculate
                                queryNewFieldName = queryFields[i].queryNewFieldName
                            }
                        }
                    }
                }
            }; 
            this.onApplyChanges(chartUrl, xValue, xValue2, xValue3, xName, yValue, yValue2, yName, yName2, queryGroupField, queryStatisticalOperator, queryFieldToCalculate, queryNewFieldName, chartType, onlyUseResultCenterData)
        },
        resize: function() {
            if (this.chart) {
                var enclosingWindow = ct_util.findEnclosingWindow(this.chartBox)
                var heightAfterResize = (enclosingWindow._contentBox.h) / 1.5
                var widthAfterResize = (enclosingWindow._contentBox.w) / 1.1
                if (heightAfterResize < 500) {
                    heightAfterResize = 500
                }
                if (widthAfterResize < 750) {
                    widthAfterResize = 750
                }
                if (this.updateChart.chartType == "pie") {
                    if (heightAfterResize / 2.1 > 150) {
                        this.chart.dataset.mappings.radius = heightAfterResize / 2.1
                    } else if (widthAfterResize < 380) {
                        this.chart.dataset.mappings.radius = heightAfterResize / 3
                    }
                    if (heightAfterResize / 2.1 < 200) {
                        this.chart.dataset.mappings.radius = 200
                    }
                }
                this.chart.show({
                    elementId: "#" + this.id + "chart",
                    renderer: "svg",
                    height: heightAfterResize,
                    width: widthAfterResize,
                });
            }
        },
        // shows/hides query menu components
        toggleQuery: function() {
            if (this.queryCheckBox.get("value") !== "agreed") {
                domStyle.set(dom.byId("queryBox"), "display", "none");
                this.queryGroupField.set('disabled', true)
                this.queryStatisticalOperator.set('disabled', true)
                this.queryFieldToCalculate.set('disabled', true)
                this.queryNewFieldName.set('disabled', true)
                this.queryButton.set('disabled', true)

            } else {
                domStyle.set(dom.byId("queryBox"), "display", "inline");
                this.queryGroupField.set('disabled', false)
                this.queryStatisticalOperator.set('disabled', false)
                this.queryFieldToCalculate.set('disabled', false)
                this.queryNewFieldName.set('disabled', false)
                this.queryButton.set('disabled', false)
            }
        },
        // shows/hides "where" query menu components
        toggleWhere: function() {
            if (this.whereCheckBox.get("value") !== "agreed") {
                domStyle.set(dom.byId("whereBox"), "display", "none");
            } else {
                domStyle.set(dom.byId("whereBox"), "display", "inline");
            }
        },
        //listener function
        onReset: function() {},
        // checks chartType and shows/hides menu components accordingly
        checkChartType: function() {
            var that = this
            if (that.chartSelect.get("value") === "bar") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "table-cell");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue2"), "display", "table-cell");
                this.xAxisValue2.set('disabled', false)
                dom.byId("xAxisValue2Heading").innerHTML = "Sub Category"
                domStyle.set(dom.byId("xAxisValue3"), "display", "none");
                this.xAxisValue3.set('disabled', true)
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisValue2"), "display", "none");
                this.yAxisValue2.set('disabled', true)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisName2"), "display", "none");
                this.yAxisName2.set('disabled', true)
                dom.byId("yAxisTableHeading").innerHTML = "Y-Axis"
                dom.byId("xAxisTableHeading").innerHTML = "X-Axis"
            }
            if (that.chartSelect.get("value") === "bar-horizontal") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue2"), "display", "none");
                this.xAxisValue2.set('disabled', true)
                dom.byId("xAxisValue2Heading").innerHTML = "Value2(optional)"
                domStyle.set(dom.byId("xAxisValue3"), "display", "none");
                this.xAxisValue3.set('disabled', true)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "table-cell");
                dom.byId("yAxisName2Heading").innerHTML = "Sub Category"
                domStyle.set(dom.byId("yAxisValue2"), "display", "table-cell");
                this.yAxisValue2.set('disabled', false)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "table-cell");
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisName2"), "display", "none");
                this.yAxisName2.set('disabled', true)
                dom.byId("yAxisTableHeading").innerHTML = "Y-Axis"
                dom.byId("xAxisTableHeading").innerHTML = "X-Axis"
            } else if (that.chartSelect.get("value") === "grouped") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "table-cell");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "table-cell");
                domStyle.set(dom.byId("xAxisValue2"), "display", "table-cell");
                dom.byId("xAxisValue2Heading").innerHTML = "Value2"
                this.xAxisValue2.set('disabled', false)
                domStyle.set(dom.byId("xAxisValue3"), "display", "table-cell");
                this.xAxisValue3.set('disabled', false)
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisValue2"), "display", "none");
                this.yAxisValue2.set('disabled', true)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisName2"), "display", "none");
                this.yAxisName2.set('disabled', true);
                dom.byId("yAxisTableHeading").innerHTML = "Value to Group by"
                dom.byId("xAxisTableHeading").innerHTML = "X-Axis"
            } else if (that.chartSelect.get("value") === "scatter" || that.chartSelect.get("value") === "bubble") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue2"), "display", "none");
                this.xAxisValue2.set('disabled', true)
                domStyle.set(dom.byId("xAxisValue3"), "display", "none");
                this.xAxisValue3.set('disabled', true)
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "table-cell");
                domStyle.set(dom.byId("yAxisValue2"), "display", "table-cell");
                this.yAxisValue2.set('disabled', false)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "table-cell");
                dom.byId("yAxisName2Heading").innerHTML = "Name for Scatterplot"
                domStyle.set(dom.byId("yAxisName2"), "display", "table-cell");
                this.yAxisName2.set('disabled', false);
                dom.byId("xAxisTableHeading").innerHTML = "X-Axis"
                dom.byId("yAxisTableHeading").innerHTML = "Y-Axis"
            } else if (that.chartSelect.get("value") === "pie") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "table-cell");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue2"), "display", "table-cell");
                this.xAxisValue2.set('disabled', false)
                dom.byId("xAxisValue2Heading").innerHTML = "Sub Category"
                domStyle.set(dom.byId("xAxisValue3"), "display", "none");
                this.xAxisValue3.set('disabled', true);
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisValue2"), "display", "none");
                this.yAxisValue2.set('disabled', true)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisName2"), "display", "none");
                this.yAxisName2.set('disabled', true)
                dom.byId("xAxisTableHeading").innerHTML = "Slices"
                dom.byId("yAxisTableHeading").innerHTML = "Size of Slices"
            } else if (that.chartSelect.get("value") === "time") {
                domStyle.set(dom.byId("xAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue3Heading"), "display", "none");
                domStyle.set(dom.byId("xAxisValue2"), "display", "none");
                this.xAxisValue2.set('disabled', true)
                dom.byId("xAxisValue2Heading").innerHTML = "Subtype(optional)"
                domStyle.set(dom.byId("xAxisValue3"), "display", "none");
                this.xAxisValue3.set('disabled', true)
                domStyle.set(dom.byId("yAxisValue2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisValue2"), "display", "none");
                this.yAxisValue2.set('disabled', true)
                domStyle.set(dom.byId("yAxisName2Heading"), "display", "none");
                domStyle.set(dom.byId("yAxisName2"), "display", "none");
                this.yAxisName2.set('disabled', true)
                dom.byId("yAxisTableHeading").innerHTML = "Y-Axis"
                dom.byId("xAxisTableHeading").innerHTML = "Time Axis"
            }

            if (that.chartSelect.get("value") === "scatter") {
                dom.byId("yAxisValue2Heading").innerHTML = "Value for Color Range";
            } else if (that.chartSelect.get("value") === "bubble") {
                dom.byId("yAxisValue2Heading").innerHTML = "Value for Bubble Size"
            }
        },
        saveChart: function() {
            this.SaveChartFactory.openWindow(this.chart)
        },
        //fills layer store with registered Services(Operational Layers)
        fillLayerStore: function() {
            var data = []
            this.layerStore.setData(data)
            var layers = this.mapModel.getRoot()
            var operationalLayers = []
            var input = []
            for (var i = 0; i < layers.children.length; i++) {
                if (layers.children[i].id == "__operationallayer__") {
                    operationalLayers.push(layers.children[i])
                }
            }
            for (var i = 0; i < operationalLayers.length; i++) {
                for (var j = 0; j < operationalLayers[i].children.length; j++) {
                    for (var k = 0; k < operationalLayers[i].children[j].children.length; k++) {
                        var pair = {
                            id: operationalLayers[i].children[j].children[k].layer.title,
                            value: operationalLayers[i].children[j].service.serviceUrl + "/" + operationalLayers[i].children[j].children[k].layer.layerId
                        }
                        input.push(pair)
                    }
                }
            }
            this.layerStore.setData(input)
        },
        //listener functuion: is called from template, ChartBoxController listens to it.
        onTriggerFilterChange: function() {},
        //listener functuion: is called from template, ChartBoxController listens to it.
        chartOnClick: function() {},
        //listener function
        onUrlChanged: function() {},
        //listener function
        onApplyChanges: function() {},
        //listener function
        onReset: function() {}
    });
});
