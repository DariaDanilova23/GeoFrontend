import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerFeaturesTableComponent } from './layer-features-table.component';

describe('LayerFeaturesTableComponent', () => {
  let component: LayerFeaturesTableComponent;
  let fixture: ComponentFixture<LayerFeaturesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LayerFeaturesTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LayerFeaturesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
