from ultralytics import YOLO
model=YOLO("newb.pt")
model.export(format="engine")
trt_model=YOLO("newb.engine")



