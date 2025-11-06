import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';
import { Layer } from 'ol/layer';
import  Map  from 'ol/Map';
@Component({
  selector: 'app-layer-list',
  templateUrl: './layer-list.component.html',
  styleUrls: ['./layer-list.component.css']
})
export class LayerListComponent {
  @Input() layers: Array<{ layer: Layer, title: string, layerName: string, selected: boolean }> = [];
  @Input() map!: Map; // добавим ссылку на карту
  @Input() isEditing: boolean = false;

  toggleLayerVisibility(layer: Layer) {
    const isVisible = layer.getVisible();
    layer.setVisible(!isVisible);
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.layers, event.previousIndex, event.currentIndex);
    this.updateLayerOrderOnMap();
  }

  private updateLayerOrderOnMap() {
    if (!this.map) return;

    const mapLayers = this.map.getLayers();

    // Удаляем только те слои, которые есть в списке layers
    this.layers.forEach(l => {
      if (mapLayers.getArray().includes(l.layer)) {
        mapLayers.remove(l.layer);
      }
    });

    // Добавляем снова в нужном порядке
    this.layers.forEach(l => {
      mapLayers.push(l.layer);
    });

    // (Необязательно) Обновим zIndex для надёжности
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].layer.setZIndex(i + 1);
    }
  }
}
