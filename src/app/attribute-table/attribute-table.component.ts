import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import Map from 'ol/Map';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { Style, Fill, Stroke, Circle } from 'ol/style';

@Component({
  selector: 'app-attribute-table',
  templateUrl: './attribute-table.component.html',
  styleUrls: ['./attribute-table.component.css']
})
export class AttributeTableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() map!: Map;
  @Input() geojsonLayer: VectorLayer<VectorSource> | undefined;

  columns: string[] = [];
  featureOverlay: VectorLayer<VectorSource> | undefined;
  selectedRowId: string | null = ''; // ID выбранной строки

  ngOnChanges(changes: SimpleChanges) {
    if (this.data && this.data.length > 0) {
      this.extractColumns();
    }

    if (changes['geojsonLayer'] && changes['geojsonLayer'].currentValue == undefined) {
      this.featureOverlay?.getSource()?.clear(); 
    }
  
  }

  ngOnInit() {
    const highlightStyle = new Style({
      fill: new Fill({
        color: 'rgba(250, 128, 114, 0.4)'
      }),
      stroke: new Stroke({
        color: '#FA8072	', // обводка
        width: 3
      }),
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: '#FA8072	' 
        })
      })
    });


    this.featureOverlay = new VectorLayer({
      source: new VectorSource(),
      style: highlightStyle
    });
    

    if (this.map) {
      this.featureOverlay.setZIndex(100);
      this.map.addLayer(this.featureOverlay);
    }
  }

  extractColumns() {
    const colSet = new Set<string>();
    colSet.add('id');
    this.data.forEach(feature => {
      Object.keys(feature.properties).forEach(key => {
        colSet.add(key);
      });
    });
    this.columns = Array.from(colSet);
  }

  onRowClick(rowData: any) {
    if (!this.geojsonLayer || !this.map) {
      console.error("geojsonLayer or map is not defined");
      return;
    }
    // Сохраняем ID выбранной строки
    this.selectedRowId = rowData.id;

    const features = this.geojsonLayer.getSource()?.getFeatures();
    const selectedFeature = features?.find(feature => feature.getId() == rowData.id);

    if (selectedFeature && this.featureOverlay ) {
      // Очистка предыдущих выделений
      this.featureOverlay.getSource()?.clear();

      // Добавление выбранной функции в слой выделения
      this.featureOverlay.getSource()?.addFeature(selectedFeature);

      const extent = selectedFeature.getGeometry()?.getExtent();
      if (extent && !extent.every(coord => isNaN(coord))) {
        // Фокусировка карты на экстент
        this.map.getView().fit(extent, { duration: 1500, maxZoom: 7 });
      } else {
        console.warn("Пустой или недопустимый экстент для выбранного объекта");
      }
    } else {
      console.warn("Объект с данным идентификатором не найден в выбраном слое");
    }
  }
}
