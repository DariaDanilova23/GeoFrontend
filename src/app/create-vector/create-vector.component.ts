import { Component, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Map, Feature } from 'ol';
import { Geometry } from 'ol/geom';
import Style from 'ol/style/Style';
import { Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap.js';
import GeoJSON from 'ol/format/GeoJSON';
import { UploadService } from '../../app/upload.service';
import Control from 'ol/control/Control.js';
import { Router } from '@angular/router';
import JSZip from 'jszip';
import shpwrite from '@mapbox/shp-write';

@Component({
  selector: 'app-create-vector',
  templateUrl: './create-vector.component.html',
  styleUrl: './create-vector.component.css'
})

export class CreateVectorComponent {
  constructor(private uploadService: UploadService, private router: Router) { }
  public activeDrawingType: 'Point' | 'LineString' | 'Polygon' | null = null;
  @Input() map!: Map; // Получаем объект карты из родительского компонента
  public draw!: Draw;
  snap!: Snap;
  modify!: Modify;
  source!: VectorSource;
  ctrlBarControl!: Control;
  public isCreatingVector: boolean = false;
  private ctrlBarElement!: HTMLElement;

  creatingVectorLayer!: VectorLayer;
  ngOnInit(): void {
    this.source = new VectorSource();
    this.creatingVectorLayer = new VectorLayer({
      source: this.source,
      style: (feature) => {
        const type = feature.getGeometry()?.getType(); 
        if (type === 'Point') {
          return new Style({
            image: new CircleStyle({ radius: 6, fill: new Fill({ color: 'red' }), stroke: new Stroke({ color: 'white', width: 2 }) })
          });
        }
        if (type === 'LineString') {
          return new Style({ stroke: new Stroke({ color: 'blue', width: 3 }) });
        }
        if (type === 'Polygon') {
          return new Style({ stroke: new Stroke({ color: 'green', width: 2 }), fill: new Fill({ color: 'rgba(0,255,0,0.3)' }) });
        }
        return undefined;
      }
    });
    this.map.addLayer(this.creatingVectorLayer);
    
    this.ctrlBarElement = document.createElement('div');
    this.ctrlBarElement.style.paddingTop = '150px';
    this.ctrlBarElement.style.background = 'transparent';
    this.ctrlBarElement.className = 'rotate-north ol-unselectable ol-control';

    const buttons = [
      { id: 1, icon: '<i class="bi bi-dot"></i>', type: 'Point', method: (btn: HTMLButtonElement) => this.drawVectorLayer('Point', btn), active: false },
      { id: 2, icon: '<i class="bi bi-slash-lg"></i>', type: 'LineString', method: (btn: HTMLButtonElement) => this.drawVectorLayer('LineString', btn), active: false },
      { id: 3, icon: '<i class="bi bi-square"></i>', type: 'Polygon', method: (btn: HTMLButtonElement) => this.drawVectorLayer('Polygon', btn), active: false },
      { id: 4, icon: '<i class="bi bi-pencil-square"></i>', method: (btn: HTMLButtonElement) => this.editDrawing(btn), active: false },
      { id: 5, icon: '<i class="bi bi-floppy"></i>', method: (btn: HTMLButtonElement) => this.saveVectorLayer(btn), active: false }
    ];

    // Храним ссылки на первые три кнопки для быстрого доступа
    const drawingButtons: HTMLButtonElement[] = [];

    buttons.forEach((btnCtrl, index) => { // Добавляем index
      const btn = document.createElement('button');
      btn.classList.add("ctrl-btn")
      btn.innerHTML = btnCtrl.icon

      // Если это одна из первых трех кнопок
      if (index < 3) {
        drawingButtons.push(btn);
      }

      btn.onclick = () => {
        this.handleButtonClick(btnCtrl.id, btn, drawingButtons);
        btnCtrl.method(btn);
      };
      this.ctrlBarElement.appendChild(btn); 
    });

    this.ctrlBarControl = new Control({ element: this.ctrlBarElement });
  }

  // Метод для управления состоянием кнопок
  private handleButtonClick(clickedId: number, clickedButton: HTMLButtonElement, drawingButtons: HTMLButtonElement[]): void {
    if (clickedId >= 1 && clickedId <= 3) {
      drawingButtons.forEach(button => {
        button.style.backgroundColor = 'white'; // Сброс цвета для всех
      });
    }
    
    else {
      if (clickedId === 5) {
        drawingButtons.forEach(button => {
          button.classList.remove('active'); // Делаем неактивными
        });
        drawingButtons.forEach(button => {
          button.style.backgroundColor = 'white'; // Сброс цвета для всех
        });
      }
    }
  }

  public showTable = false;
  fields: string[] = [];

  toggleTable() {
    this.showTable = !this.showTable;
    if (this.showTable && this.fields.length === 0) {
      const features = this.source?.getFeatures() || [];
      if (features.length > 0) {
        this.fields = Object.keys(features[0].getProperties()).filter(k => k !== 'geometry');
      }
    }
  }

  openTable() {
    // Берем текущие фичи
    const features = this.source?.getFeatures() || [];
    const geojsonStr = new GeoJSON().writeFeatures(features);

    // Передадим GeoJSON через localStorage 
    localStorage.setItem('featuresData', geojsonStr);

    // Открываем новую вкладку с таблицей
    const url = this.router.serializeUrl(this.router.createUrlTree(['/features-table']));
    window.open(url, '_blank');
  }

  toggleCreatingVector() {
    if (this.isCreatingVector) {
      this.isCreatingVector = false;
      this.map.removeInteraction(this.draw);
      this.map.removeInteraction(this.snap);
      this.map.removeInteraction(this.modify);
      this.map.removeControl(this.ctrlBarControl);
    } else {
      this.isCreatingVector = true;

      this.map.addControl(this.ctrlBarControl);
    }
  }
  editDrawing(button: HTMLButtonElement) {
    button.classList.toggle('active');
    if (button.classList.contains('active')) {
      if (this.draw) {
        this.modify = new Modify({ source: this.source });
        this.map.addInteraction(this.modify);
        button.style.backgroundColor = 'blue'
      }
    }
    else {
      this.map.removeInteraction(this.modify)
      button.style.backgroundColor = 'white'
    }
  }
  drawVectorLayer(drawingStyle: 'Point' | 'LineString' | 'Polygon', button: HTMLButtonElement) {
    // Убираем старый Draw и Snap
    button.classList.toggle('active');
    if (button.classList.contains('active')) {
      button.style.background = '#C1AFED';
    }
    else {
      button.style.background = 'white';
    }

    if (!button.classList.contains('active')) {
      this.activeDrawingType = null; // Инструмент деактивирован
      return;
    }

    this.activeDrawingType = drawingStyle;

    if (this.draw) { this.map.removeInteraction(this.draw); this.source.clear() }
    if (this.snap) this.map.removeInteraction(this.snap);
    if (!button.classList.contains('active'))
      return;

    this.fields = [];
    this.showTable = false;

    this.draw = new Draw({
      source: this.source,
      type: drawingStyle
    });
    this.map.addInteraction(this.draw);

    this.snap = new Snap({
      source: this.source,
    });
    this.map.addInteraction(this.snap);

    this.draw.on('drawend', (e) => {
      const feature = e.feature;
      feature.setProperties({
        type: drawingStyle,
        name: `${drawingStyle} ${Date.now()}`
      });
      console.log(`Создан ${drawingStyle}:`, feature.getProperties());

    });
  }
 
  async saveVectorLayer(button: HTMLButtonElement) {
    const features = this.source.getFeatures();

    if (!features.length) {
      alert('Нет объектов для сохранения!');
      return;
    }

    if (!this.activeDrawingType) {
      alert('Пожалуйста, выберите инструмент рисования (точки, линии или полигоны) и нарисуйте объекты, прежде чем сохранять их.');
      return;
    }

    // Фильтруем объекты, оставляя только те, которые соответствуют активному типу
    const featuresToSave = this.source.getFeatures().filter(feature =>
      feature.getGeometry()?.getType() === this.activeDrawingType
    );

    if (!featuresToSave.length) {
      alert(`Нет объектов типа ${this.activeDrawingType} для сохранения!`);
      return;
    }

    //Запрос имени слоя
    const layerNameInput = prompt("Пожалуйста, введите имя для нового слоя (только латиница, без пробелов):", `layer_${Date.now()}`);

    if (layerNameInput === null || layerNameInput.trim() === '') {
      alert('Имя слоя не может быть пустым. Сохранение отменено.');
      return; 
    }
    const layerName = layerNameInput.trim();

    try {
      await this.uploadService.uploadGeoJson(featuresToSave, layerName);

      alert(`Слой "${layerName}" успешно загружен в GeoServer!`);
    } catch (err) {
      console.error('Ошибка при загрузке слоя:', err);
      alert('Ошибка при загрузке слоя.');
    } finally {
      button.disabled = false;
    }
  }
  

  onFeaturesChange(updatedFeatures: Feature<Geometry>[]) {
    this.source.clear();
    this.source.addFeatures(updatedFeatures);
  }
  onFieldsChange(updatedFields: string[]) {
    this.fields = [...updatedFields];
  }
}
