import { Component, EventEmitter, Output, Input } from '@angular/core';
import { Layer } from 'ol/layer';
import Map from 'ol/Map';
import Style from 'ol/style/Style';
import { Stroke, Fill, Circle } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-search-data',
  templateUrl: './search-data.component.html',
  styleUrl: './search-data.component.css'
})
export class SearchDataComponent {
  @Input() vectorLayers: Array<{ layer: Layer, title: string, layerName: string }> = []; 
  @Input() map!: Map;
  private geojsonLayer: VectorLayer<VectorSource> | undefined;
  // Переключатель для отображения панели
  public showControlPanel = false;
  public selectedLayerName: string = ''; // Переменная для хранения выбранного значения
  public attributeData: any[] = []; // Данные для таблицы
  public isSearchActive: boolean = false;

  @Output() dataFound = new EventEmitter<any[]>();
  @Output() geojsonLayerCreated = new EventEmitter<VectorLayer<VectorSource>>();
  @Output() buttonClick = new EventEmitter<void>();

  toggleControlPanel() {
    this.isSearchActive = !this.isSearchActive
    this.showControlPanel = !this.showControlPanel;
    if (!this.isSearchActive) {
      this.geojsonLayer?.getSource()?.clear();
      this.geojsonLayer = undefined;
      this.geojsonLayerCreated.emit(this.geojsonLayer); // возвращаем обнуленный geojsonLayer родителю

      setTimeout(() => {
        this.attributeData = [];
        this.dataFound.emit(this.attributeData);
      });
      this.showControlPanel = false;
    }
    
  }

  addGeoJsonToMap(url: string) {//ф-ия подсвечивающая на карте полигоны выбранного слоя
    // Удаление существующего слоя
    if (this.geojsonLayer) {
      this.geojsonLayer.getSource()?.clear();
    }


    // Создание нового слоя
    this.geojsonLayer = new VectorLayer({
      source: new VectorSource({
        url: url,
        format: new GeoJSON()
      }),
    });

    // Обработчик события добавления объектов
    this.geojsonLayer.getSource()?.on('addfeature', () => {
      this.map?.getView().fit(
        this.geojsonLayer?.getSource()?.getExtent()!,
        { duration: 1590, size: this.map?.getSize(), maxZoom: 21 }
      );
    });
    this.geojsonLayer.setZIndex(90);

    this.map.addLayer(this.geojsonLayer);
    this.geojsonLayerCreated.emit(this.geojsonLayer); // передаем измененный geojsonLayer обратно родителю
  };

  
  constructor(private http: HttpClient) { }

  populateQueryTable(url: string) {
    this.http.get<any>(url).subscribe(data => {
      const features = data.features;
      if (features && features.length > 0) {
        this.attributeData = features;
      } else {
        this.attributeData = []; // Очистить данные, если ничего нет
      }

      // Отправляем данные только после их загрузки
      this.dataFound.emit(this.attributeData);
    });
  }


  onButtonClick() {
    if (!this.selectedLayerName)
      return
    const parts = this.selectedLayerName.split(":");
    var url = "http://localhost:8080/geoserver/" + parts[0] + "/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=" + parts[1] + "&outputFormat=application/json"; //url слоя на geoserver
    this.addGeoJsonToMap(url); //ф-ия подсвечивающая на карте полигоны выбранного слоя
    this.populateQueryTable(url); //ф-ия создания таблицы атрибутов
   
    this.showControlPanel = false;
  }
}
