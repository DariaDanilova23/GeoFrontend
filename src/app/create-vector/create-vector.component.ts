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

  @Input() map!: Map; // Получаем объект карты из родительского компонента
  public draw!: Draw;
  snap!: Snap;
  modify!: Modify;
  source!: VectorSource;
  ctrlBarControl!: Control;
  public isCreatingVector: boolean = false;
  creatingVectorLayer!: VectorLayer;
  private roles: string[] = [];
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


    const ctrlBar = document.createElement('div');
    ctrlBar.style.paddingTop = '150px';
    ctrlBar.style.background = 'transparent';
    ctrlBar.className = 'rotate-north ol-unselectable ol-control';
    const buttons = [
      { id: 1, icon: '<i class="bi bi-dot"></i>', type: 'Point', method: (btn: HTMLButtonElement) => this.drawVectorLayer('Point', btn), active: false },
      { id: 2, icon: '<i class="bi bi-slash-lg"></i>', type: 'LineString', method: (btn: HTMLButtonElement) => this.drawVectorLayer('LineString', btn), active: false },
      { id: 3, icon: '<i class="bi bi-square"></i>', type: 'Polygon', method: (btn: HTMLButtonElement) => this.drawVectorLayer('Polygon', btn), active: false },
      { id: 4, icon: '<i class="bi bi-pencil-square"></i>', method: (btn: HTMLButtonElement) => this.editDrawing(btn), active: false },
      { id: 5, icon: '<i class="bi bi-floppy"></i>', method: (btn: HTMLButtonElement) => this.saveVectorLayer(btn), active: false }
    ];
    buttons.forEach(btnCtrl => {
      const btn = document.createElement('button');
      btn.classList.add("ctrl-btn")
      btn.innerHTML = btnCtrl.icon
      btn.onclick = () => {
        btnCtrl.method(btn);
        /*
        ctrlBar.querySelectorAll('button').forEach(b => { if (b != btn) b.style.backgroundColor = 'white' });
        btnCtrl.active = !btnCtrl.active;
        if (btnCtrl.active) {
          btn.style.backgroundColor = 'red';
        }
        else
          btn.style.backgroundColor = 'white';
          */
      };
      ctrlBar.appendChild(btn);
    });
    this.ctrlBarControl = new Control({ element: ctrlBar });

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

    // Передадим GeoJSON через localStorage (удобно для межвкладочного обмена)
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
      //this.source.clear();
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
      button.style.background = 'blue';
    }
    else {
      button.style.background = 'white';
    }

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

    button.disabled = true;
    button.innerText = '⏳ Сохраняем...';

    try {
      const layerName = `layer_${Date.now()}`;
      await this.uploadService.uploadGeoJson(features, layerName);
      alert(`✅ Слой "${layerName}" успешно загружен в GeoServer!`);
    } catch (err) {
      console.error('Ошибка при загрузке слоя:', err);
      alert('❌ Ошибка при загрузке слоя. Проверьте консоль и настройки GeoServer.');
    } finally {
      button.disabled = false;
      button.innerText = '💾';
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
