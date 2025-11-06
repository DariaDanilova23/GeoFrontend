import { Component, OnInit } from '@angular/core';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';
import LayerSwitcher from 'ol-layerswitcher';
import { BaseLayerOptions, GroupLayerOptions } from 'ol-layerswitcher';
import ScaleLine from 'ol/control/ScaleLine';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import { Stroke, Fill, Circle as CircleStyle } from 'ol/style';

import { HttpClient } from '@angular/common/http';
import { UploadService } from '../../app/upload.service';
import { sessionData } from '../session-data';
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements OnInit {
  public map!: Map;
  public vectorLayers: Array<{ layer: VectorLayer<VectorSource>, title: string, layerName: string, selected: boolean }> = [];
  public rasterLayers: Array<{ layer: ImageLayer<ImageWMS>, title: string, layerName: string, selected: boolean }> = [];
  public personalVectorLayers: Array<{ layer: VectorLayer<VectorSource>, title: string, layerName: string, selected: boolean }> = [];
  public personalRasterLayers: Array<{ layer: ImageLayer<ImageWMS>, title: string, layerName: string, selected: boolean }> = []; 
  public showMousePosition: boolean = false;
  public showLayers: boolean = true;
  public showCharts: boolean = true;
  public showDataTable: boolean = true;
  public nickname: string | null = null;
  public combinedVectors: Array<{ layer: VectorLayer<VectorSource>, title: string, layerName: string }> = [];
  attributeData: any[] = [];
  geojsonLayer: VectorLayer<VectorSource> | undefined;
  public isEditActive: boolean = false;

  layers: { [key: string]: VectorLayer<any> } = {};
  vectorSource = new VectorSource();

  constructor(private http: HttpClient, private uploadService: UploadService) { }
  //async
  ngOnInit() {
    this.initilizeMap();
    this.loadVectorLayers();
    this.loadRasterLayers();
    sessionData.nickname$.subscribe(nick => {
      if (nick) {
        this.loadPersonalVectorLayers();
        this.loadPersonalRasterLayers();
      }
    }) 
  }

  initilizeMap() {
    const mapView = new View({
      center: [716457, 454484],
      zoom: 1,
      /*projection:'EPSG:4326'*/
    });

    const standard = new TileLayer({
      title: 'OSMStandard',
      type: 'base',
      visible: true,
      source: new OSM(),
      crossOrigin: 'anonymous'
    } as BaseLayerOptions);

    const arcGIS = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous'
      }),
      type: 'base',
      visible: false,
      title: 'ArcGIS Map'
    } as BaseLayerOptions);

    const googleMap = new TileLayer({
      source: new XYZ({
        url: 'http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
        crossOrigin: 'anonymous'
      }),
      type: 'base',
      visible: false,
      title: 'googleMap'
    } as BaseLayerOptions);

    const baseMaps = new LayerGroup({
      title: 'Базовый слой',
      layers: [standard, arcGIS, googleMap]
    } as GroupLayerOptions);

    this.map = new Map({
      target: 'map',
      layers: [baseMaps],
      view: mapView
    });

    const layerSwitcher = new LayerSwitcher({
      activationMode: 'click',
      startActive: false,
      tipLabel: 'Слои',
      groupSelectStyle: 'children',
      collapseTipLabel: 'Скрыть'
    });

    this.map.addControl(layerSwitcher);
    this.scaleMap(this.map);
  }

  loadVectorLayers() {
    const url = 'http://localhost:8080/geoserver/geoportal/wfs?request=getCapabilities';

    this.http.get(url, { responseType: 'text' }).subscribe(response => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(response, 'application/xml');

      const featureTypes = xml.getElementsByTagName('FeatureType');
      Array.from(featureTypes).forEach((featureType: any) => {
        const nameElement = featureType.getElementsByTagName('Name')[0];
        const titleElement = featureType.getElementsByTagName('Title')[0];
        if (nameElement && titleElement) {
          const layerName = nameElement.textContent;
          const titleName = titleElement.textContent;

          const newLayer = new VectorLayer({
            source: new VectorSource({
              url: `http://localhost:8080/geoserver/geoportal/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}&maxFeatures=50&outputFormat=application/json`,
              format: new GeoJSON(),
              attributions: '@geoserver'
            }),
            style: new Style({
              fill: new Fill({
                color: 'rgba(0, 0, 255, 0.5)'
              }),
              stroke: new Stroke({
                color: '#319FD3',
                width: 1
              })
            }),
            visible: true
          });
          this.map.addLayer(newLayer);
          this.vectorLayers.push({ layer: newLayer, title: titleName, layerName: layerName, selected: false });
        }
      });
      this.combinedVectors = [...this.vectorLayers, ...this.personalVectorLayers];
    });
  }

  loadPersonalVectorLayers() {
    const url = `http://localhost:8080/geoserver/${sessionData.getNickname()}/wfs?request=getCapabilities`;
    this.http.get(url, { responseType: 'text' }).subscribe(response => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(response, 'application/xml');
      const featureTypes = xml.getElementsByTagName('FeatureType');
      Array.from(featureTypes).forEach((featureType: any) => {
        const nameElement = featureType.getElementsByTagName('Name')[0];
        const titleElement = featureType.getElementsByTagName('Title')[0];

        if (nameElement && titleElement) {
          const layerName = nameElement.textContent;
          const titleName = titleElement.textContent;

          const newLayer = new VectorLayer({
            source: new VectorSource({
              url: `http://localhost:8080/geoserver/${sessionData.getNickname()}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}&maxFeatures=50&outputFormat=application/json`,
              format: new GeoJSON(),
            /*  attributions: '@geoserver'*/
            }),
            style: new Style({
              fill: new Fill({
                color: 'rgba(0, 0, 255, 0.5)'
              }),
              stroke: new Stroke({
                color: '#319FD3',
                width: 1
              })
            }),
            visible: true
          });

          this.map.addLayer(newLayer);
          this.personalVectorLayers.push({ layer: newLayer, title: titleName, layerName: layerName, selected: false });
        }
      });
      this.combinedVectors = [...this.vectorLayers, ...this.personalVectorLayers];
    });
  }
  onControlButtonClick() {

  }
  loadRasterLayers() {
    const wmsUrl = 'http://localhost:8080/geoserver/geoportal/wms?request=getCapabilities';

    this.http.get(wmsUrl, { responseType: 'text' }).subscribe(response => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(response, 'application/xml');
      const layers = xml.getElementsByTagName('Layer');

      for (let i = 0; i < layers.length; i++) {
        const name = layers[i].getElementsByTagName('Name')[0]?.textContent;
        if (!name) continue;

        // Проверяем ключевые слова
        const keywords = layers[i].getElementsByTagName('Keyword');
        let isVector = false;

        for (let j = 0; j < keywords.length; j++) {
          if (keywords[j].textContent === 'features') {
            isVector = true;
            break;
          }
        }

        // Если это векторный слой, пропускаем его
        if (isVector) continue;

        const rasterLayer = new ImageLayer({
          source: new ImageWMS({
            url: 'http://localhost:8080/geoserver/geoportal/wms',
            params: { LAYERS: name, FORMAT: 'image/png' },
            serverType: 'geoserver',
            crossOrigin: 'anonymous',
          }),
          visible: false
        });

        this.rasterLayers.push({ layer: rasterLayer, title: name, layerName: name, selected: false });
        this.map.addLayer(rasterLayer);
      }
    });
  }

  loadPersonalRasterLayers() {
    const wmsUrl = `http://localhost:8080/geoserver/${sessionData.getNickname()}/wms?request=getCapabilities`;
    this.http.get(wmsUrl, { responseType: 'text' }).subscribe(response => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(response, 'application/xml');
      const layers = xml.getElementsByTagName('Layer');

      for (let i = 0; i < layers.length; i++) {
        const name = layers[i].getElementsByTagName('Name')[0]?.textContent;
        if (!name) continue;

        // Проверяем ключевые слова
        const keywords = layers[i].getElementsByTagName('Keyword');
        let isVector = false;

        for (let j = 0; j < keywords.length; j++) {
          if (keywords[j].textContent === 'features') {
            isVector = true;
            break;
          }
        }

        // Если это векторный слой, пропускаем его
        if (isVector) continue;

        const personalRasterLayer = new ImageLayer({
          source: new ImageWMS({
            url: `http://localhost:8080/geoserver/${sessionData.getNickname()}/wms`,
            params: { layers: name, format: 'image/png' },
            serverType: 'geoserver',
            crossOrigin: 'anonymous',
          }),
          visible: false
        });

        this.personalRasterLayers.push({ layer: personalRasterLayer, title: name, layerName: name, selected: false });
        this.map.addLayer(personalRasterLayer);
      }
    });
  }

  scaleMap(map: Map) {
    const control = new ScaleLine({
      units: "metric",
      bar: true,
      text: true,
      minWidth: 140,
    });
    map.addControl(control);
  }

  onMouseEnter() {
    this.showMousePosition = true;
  }

  onMouseLeave() {
    this.showMousePosition = false;
  }

  handleData(data: any) {
    this.attributeData = Array.isArray(data) ? data : [];
  }

  onGeojsonLayerCreated(layer: VectorLayer<VectorSource>) {
    this.geojsonLayer = layer; 
  }
  //Метод для включения режима редактирования
  toggleEdit() {
    this.isEditActive = !this.isEditActive;
  }
  //Удаление слоёв на geoserver
  deleteLayers() {
    this.uploadService.deleteLayers(this.personalRasterLayers.filter(layer => layer.selected).map(layer => layer.title),
      this.personalVectorLayers.filter(layer => layer.selected).map(layer => layer.title), sessionData.getNickname()!)
    //Удаление из массива слоёв
    this.personalRasterLayers = this.personalRasterLayers.filter(
      (layer) => !layer.selected
    );
    this.personalVectorLayers = this.personalVectorLayers.filter(
      (layer) => !layer.selected
    );
  }

   async createReport(indexName: string) {
    // Динамически загружаем библиотеки для уменьшения размера основного бандла
    const { default: jsPDF } = await import('jspdf');
    const html2canvas = await import('html2canvas').then(m => m.default);

    // Создаем PDF документ
     const pdf = new jsPDF('landscape', 'mm', 'a4');
   
     pdf.addFont("../../assets/times.ttf", "MyFont", "normal");
     pdf.setFont("MyFont");

    // 1. Добавляем заголовок отчета
    pdf.setFontSize(20);
    pdf.setTextColor(40);
    pdf.text(`${indexName} отчёт`, 105, 15, { align: 'center' });

    // 2. Добавляем карту в PDF
    const mapElement = document.getElementById('map');
    if (mapElement) {
      const mapCanvas = await html2canvas(mapElement, {
        useCORS: true, // Разрешаем CORS для изображений
        logging: false, // Отключаем логирование
        allowTaint: true // Разрешаем "загрязнение" canvas
      });

      const mapImgData = mapCanvas.toDataURL('image/png');
      pdf.addImage(mapImgData, 'PNG', 15, 25, 180, 120);
    }

    // 3. Добавляем легенду в зависимости от индекса
    this.addIndexLegend(pdf, indexName);

    // 4. Добавляем метаданные
    pdf.setFontSize(10);
     pdf.text(`Дата создания: ${new Date().toLocaleString()}`, 15, 155);
     pdf.text(`Пользователь: ${sessionData.getNickname() || 'Anonymous'}`, 15, 160);

    // 5. Сохраняем PDF
    pdf.save(`${indexName}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private addIndexLegend(pdf: any, indexName: string) {
    // Определяем цветовую шкалу в зависимости от индекса
    let legendColors: any[];
    let title = '';
    let description = '';

    switch (indexName.toUpperCase()) {
      case 'NDVI':
        title = 'NDVI цвета';
        description = 'Normalized Difference Vegetation Index';
        legendColors = [
          { color: '#a50026', value: '-1.0', label: 'Вода/ Нет растительности' },
          { color: '#d73027', value: '-0.6', label: 'Нет растительности' },
          { color: '#f46d43', value: '-0.2', label: 'Bare soil' },
          { color: '#fdae61', value: '0.2', label: 'Голая почва' },
          { color: '#fee08b', value: '0.4', label: 'Умеренная растительность' },
          { color: '#ffffbf', value: '0.6', label: 'Здоровая растительность' },
          { color: '#d9ef8b', value: '0.8', label: 'Очень здоровая растительность' },
          { color: '#a6d96a', value: '1.0', label: 'Густая растительность' }
        ];
        break;
      case 'CVI':
        title = 'CVI цвета';
        description = 'Chlorophyll Vegetation Index';
        legendColors = [
          { color: '#a50026', value: '-1.0', label: 'Вода/ Нет растительности'},
          { color: '#d73027', value: '-0.6', label: 'Нет растительности'},
          { color: '#f46d43', value: '-0.2', label: 'Bare soil' },
          { color: '#fdae61', value: '0.2', label: 'Голая почва' },
          { color: '#fee08b', value: '0.4', label: 'Умеренная растительность' },
          { color: '#ffffbf', value: '0.6', label: 'Здоровая растительность' },
          { color: '#d9ef8b', value: '0.8', label: 'Очень здоровая растительность' },
          { color: '#a6d96a', value: '1.0', label: 'Густая растительность' }
        ];
        break;
      case 'EVI':
        title = 'EVI цвета';
        description = 'Enhanced vegetation index';
        legendColors = [
          { color: '#a50026', value: '-1.0', label: 'Вода/ Нет растительности'},
          { color: '#d73027', value: '-0.6', label: 'Нет растительности'},
          { color: '#f46d43', value: '-0.2', label: 'Bare soil' },
          { color: '#fdae61', value: '0.2', label: 'Голая почва' },
          { color: '#fee08b', value: '0.4', label: 'Умеренная растительность' },
          { color: '#ffffbf', value: '0.6', label: 'Здоровая растительность' },
          { color: '#d9ef8b', value: '0.8', label: 'Очень здоровая растительность' },
          { color: '#a6d96a', value: '1.0', label: 'Густая растительность' }
        ];
        break;

      // Добавьте другие индексы по аналогии
      default:
        title = `${indexName} Color Scale`;
        description = 'Spectral index values';
        legendColors = [
          { color: '#000000', value: 'Min', label: 'Minimum value' },
          { color: '#ffffff', value: 'Max', label: 'Maximum value' }
        ];
    }

    // Заголовок легенды
    pdf.setFontSize(14);
    pdf.text(title, 200, 25);
    pdf.setFontSize(10);
    pdf.text(description, 200, 30);

    // Рисуем легенду
    let yPos = 35;
    legendColors.forEach((item: any) => {
      pdf.setFillColor(item.color); // Теперь передаем HEX значение
      pdf.setDrawColor('#000000'); // Черная граница
      pdf.rect(200, yPos, 10, 10, 'FD'); // 'FD' - fill and draw
      pdf.setTextColor(0);
      pdf.setFontSize(10);
      pdf.text(`${item.value} - ${item.label}`, 215, yPos + 8);
      yPos += 12;
    });

    // Добавляем цветовую шкалу
    this.addColorGradient(pdf, 200, yPos + 10, 80, 10, indexName);
    pdf.setFontSize(8);

    const minValue = legendColors[0].value;
    const maxValue = legendColors[legendColors.length - 1].value;
    pdf.text(minValue, 200, yPos + 25);
    pdf.text(maxValue, 280, yPos + 25);
  }

  private addColorGradient(pdf: any, x: number, y: number, width: number, height: number, indexName: string) {
    const gradientSteps = 100;
    const stepWidth = width / gradientSteps;

    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const color = this.getIndexColor(ratio, indexName);
      pdf.setDrawColor(color); // Устанавливаем цвет границы
      pdf.setFillColor(color); // Устанавливаем цвет заливки
      pdf.rect(x + i * stepWidth, y, stepWidth, height, 'FD'); // 'FD' - fill and draw
    }
  }

  private getIndexColor(ratio: number, indexName: string): string {
    switch (indexName.toUpperCase()) {
      case 'NDVI':
        // Градиент от красного к зеленому для NDVI
        if (ratio < 0.5) {
          // От красного (#a50026) к желтому (#ffffbf)
          const r = 165 + Math.round(90 * ratio * 2);
          const g = Math.round(255 * ratio * 2);
          const b = 38 + Math.round(157 * ratio * 2);
          return this.rgbToHex(r, g, b); // Конвертируем в HEX
        } else {
          // От желтого (#ffffbf) к зеленому (#a6d96a)
          const r = 255 - Math.round(90 * (ratio - 0.5) * 2);
          const g = 255 - Math.round(76 * (ratio - 0.5) * 2);
          const b = 191 - Math.round(125 * (ratio - 0.5) * 2);
          return this.rgbToHex(r, g, b); // Конвертируем в HEX
        }

      default:
        // Градиент от черного к белому по умолчанию
        const val = Math.round(255 * ratio);
        return this.rgbToHex(val, val, val); // Конвертируем в HEX
    }
  }

  // Вспомогательная функция для конвертации RGB в HEX
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
        .toUpperCase();
  }
}
