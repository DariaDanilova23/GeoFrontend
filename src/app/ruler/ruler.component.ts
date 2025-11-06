import { Component, OnInit, Input } from '@angular/core';
import Map from 'ol/Map';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import Draw, { DrawEvent } from 'ol/interaction/Draw';
import Overlay from 'ol/Overlay';
import { LineString, Polygon } from 'ol/geom';
import { unByKey } from 'ol/Observable';
import { getArea, getLength } from 'ol/sphere';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';

@Component({
    selector: 'app-ruler',
    templateUrl: './ruler.component.html',
    styleUrls: ['./ruler.component.css']
})
export class RulerComponent implements OnInit {
    @Input() map!: Map;
    private vectorSource = new VectorSource();
    private vectorLayer = new VectorLayer({
        source: this.vectorSource,
        style: new Style({
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
            stroke: new Stroke({
                color: '#ffcc33',
                width: 2,
            }),
            image: new CircleStyle({
                radius: 7,
                fill: new Fill({
                    color: '#ffcc33',
                }),
            }),
        }),
    });
    private draw!: Draw;
    private measureTooltipElement!: HTMLElement | null;
    private measureTooltip!: Overlay;
    private helpTooltipElement!: HTMLElement | null;
    private helpTooltip!: Overlay;
    private sketch: any; // Adjust type as needed
    public isPolygonActive: boolean = false;
    public isLineActive: boolean = false;

    constructor() { }

    ngOnInit(): void {
      if (this.map) {
        this.vectorLayer.setZIndex(110);
            this.map.addLayer(this.vectorLayer);
        }
    }

    togglePolygonMeasurement() {
        if (this.isPolygonActive) {
            this.deactivateMeasurement();
            this.isPolygonActive = false;
        } else {
            this.deactivateMeasurement();
            this.addInteraction('Polygon');
            this.isPolygonActive = true;
        }
    }

    toggleLineMeasurement() {
        if (this.isLineActive) {
            this.deactivateMeasurement();
            this.isLineActive = false;
        } else {
            this.deactivateMeasurement();
            this.addInteraction('LineString');
            this.isLineActive = true;
        }
    }

    deactivateMeasurement() {
        if (this.map) {
            this.map.removeInteraction(this.draw);
            this.removeHelpTooltip();
            this.removeMeasureTooltips();
            this.vectorSource.clear();
        }
        this.isPolygonActive = false;
        this.isLineActive = false;
    }

    addInteraction(type: 'Polygon' | 'LineString'): void {
        this.draw = new Draw({
            source: this.vectorSource,
            type: type,
        });

        this.map.addInteraction(this.draw);
        this.createMeasureTooltip();
        this.createHelpTooltip();

        this.draw.on('drawstart', (evt: DrawEvent) => {
            this.sketch = evt.feature;
            let tooltipCoord: number[] = [];

            if (type === 'Polygon') {
                tooltipCoord = (this.sketch.getGeometry() as Polygon).getInteriorPoint().getCoordinates();
            } else if (type === 'LineString') {
                tooltipCoord = (this.sketch.getGeometry() as LineString).getLastCoordinate();
            }

            this.sketch.getGeometry().on('change', (evt: any) => {
                const geom = evt.target;
                let output: string;
                if (geom instanceof Polygon) {
                    output = this.formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof LineString) {
                    output = this.formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                } else {
                    output = '';
                }
                if (this.measureTooltipElement) {
                    this.measureTooltipElement.innerHTML = output;
                    this.measureTooltip.setPosition(tooltipCoord);
                }
            });
        });

        this.draw.on('drawend', () => {
            if (this.measureTooltipElement) {
                this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
                this.measureTooltip.setOffset([0, -7]);
                // Keep the tooltip for display purposes
                this.measureTooltipElement = null;
                this.createMeasureTooltip();
            }
        });
    }

    createMeasureTooltip(): void {
        this.measureTooltipElement = document.createElement('div');
        this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        this.measureTooltip = new Overlay({
            element: this.measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
            insertFirst: false,
        });
        this.map.addOverlay(this.measureTooltip);
    }

    createHelpTooltip(): void {
        if (this.helpTooltipElement) {
            this.helpTooltipElement.parentNode!.removeChild(this.helpTooltipElement);
        }
        this.helpTooltipElement = document.createElement('div');
        this.helpTooltipElement.className = 'ol-tooltip hidden';
        this.helpTooltip = new Overlay({
            element: this.helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left',
        });
        this.map.addOverlay(this.helpTooltip);
    }

    removeHelpTooltip(): void {
        if (this.helpTooltipElement && this.helpTooltipElement.parentNode) {
            this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
            this.helpTooltipElement = null;
        }
        if (this.helpTooltip) {
            this.map.removeOverlay(this.helpTooltip);
            this.helpTooltip = null!;
        }
    }

    removeMeasureTooltips(): void {
        this.map.getOverlays().getArray().slice().forEach(overlay => {
            const element = overlay.getElement();
            if (element && (element.classList.contains('ol-tooltip-measure') || element.classList.contains('ol-tooltip-static'))) {
                this.map.removeOverlay(overlay);
            }
        });
    }

    formatLength(line: LineString): string {
        const length = getLength(line);
        let output;
        if (length > 100) {
            output = Math.round((length / 1000) * 100) / 100 + ' км';
        } else {
            output = Math.round(length * 100) / 100 + ' м';
        }
        return output;
    }

    formatArea(polygon: Polygon): string {
        const area = getArea(polygon);
        let output;
        if (area > 10000) {
            output = Math.round((area / 1000000) * 100) / 100 + ' км<sup>2</sup>';
        } else {
            output = Math.round(area * 100) / 100 + ' м<sup>2</sup>';
        }
        return output;
    }
}
