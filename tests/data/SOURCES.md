# BOM 文件来源记录

本文档记录了 `tests/data` 文件夹中BOM文件的来源链接，用于人工验证。

## 下载的实际BOM文件

### 1. JLCPCB 官方示例BOM
- **文件名**: `Sample-BOM_JLCSMT.xlsx`
- **来源**: JLCPCB官方文档
- **下载链接**: https://s3.amazonaws.com/helpscout.net/docs/assets/59f1de7804286313cffbb22c/attachments/60ee4acd9e87cb3d0124d284/Sample-BOM_JLCSMT.xlsx
- **说明**: JLCPCB官方提供的BOM模板示例文件

### 2. KiCAD BOM示例
- **文件名**: `kicad_bom_example.csv`
- **来源**: GitHub - controlpaths/hackbat项目
- **下载链接**: https://raw.githubusercontent.com/controlpaths/hackbat/main/kicad/hackbat/production_files/bom.csv
- **项目地址**: https://github.com/controlpaths/hackbat
- **说明**: 来自hackbat项目的KiCAD导出BOM文件

### 3. PCB BOM示例 (CR-6 SE热端)
- **文件名**: `pcb_bom_example.csv`
- **来源**: GitHub - CR6Community/Hardware项目
- **下载链接**: https://raw.githubusercontent.com/CR6Community/Hardware/master/CR-6%20SE%20hotend%20PCB/CR-6%20SE%20hotend%20PCB%20V0.1/CR6_Hotend%20PCB_V0.1%20-%20Bill%20of%20Materials.csv
- **项目地址**: https://github.com/CR6Community/Hardware
- **说明**: CR-6 SE热端PCB的BOM文件

### 4. BBC microbit BOM
- **文件名**: `microbit_bom_example.csv`
- **来源**: GitHub - bbcmicrobit/hardware项目
- **下载链接**: https://raw.githubusercontent.com/bbcmicrobit/hardware/master/V1.5/Bill%20of%20Materials-BBC-microbit_v1.5.csv
- **项目地址**: https://github.com/bbcmicrobit/hardware
- **说明**: BBC microbit V1.5的BOM文件

### 5. GRITSBot BOM
- **文件名**: `gritsbot_bom_example.csv`
- **来源**: GitHub - robotarium/GRITSBot_hardware_design项目
- **下载链接**: https://raw.githubusercontent.com/robotarium/GRITSBot_hardware_design/master/pcb_design/main_board/bom.csv
- **项目地址**: https://github.com/robotarium/GRITSBot_hardware_design
- **说明**: GRITSBot机器人主板的BOM文件

## 创建的代表性BOM文件

以下文件是根据各EDA工具的官方文档格式创建的代表性示例，非实际下载：

### 6. 嘉立创EDA BOM示例
- **文件名**: `easyeda_bom_example.csv`
- **格式参考**: 
  - https://docs.easyeda.com/en/Schematic/Export-BOM/
  - https://prodocs.easyeda.com/en/pcb/export-bill-of-materials-bom/
- **说明**: 根据嘉立创EDA文档创建的CSV格式示例，使用Tab分隔符

### 7. Altium Designer BOM示例
- **文件名**: `altium_bom_example.csv`
- **格式参考**: 
  - https://github.com/gbmhunter/Altium-Bom-Template
  - https://www.altium.com/documentation/altium-designer/activebom/creating-document
- **说明**: 根据Altium Designer BOM模板创建的CSV格式示例

### 8. OrCAD BOM示例
- **文件名**: `orcad_bom_example.csv`
- **格式参考**: 
  - https://www.ema-eda.com/how-to-page/how-to-generate-a-bom-in-orcad-x-capture/
  - https://resources.pcb.cadence.com/blog/2024-how-to-create-a-bom-file-with-orcad-x
- **说明**: 根据OrCAD文档创建的CSV格式示例

### 9. PADS BOM示例
- **文件名**: `pads_bom_example.csv`
- **格式参考**: 
  - https://jlcpcb.com/help/article/bill-of-materials-for-pcb-assembly
- **说明**: 根据PADS/通用PCB BOM格式创建的CSV格式示例

## 参考文档

### 嘉立创EDA
- 导出BOM文档: https://docs.easyeda.com/en/Schematic/Export-BOM/
- 专业版BOM导出: https://prodocs.easyeda.com/en/pcb/export-bill-of-materials-bom/

### Altium Designer
- BOM模板GitHub: https://github.com/gbmhunter/Altium-Bom-Template
- 官方文档: https://www.altium.com/documentation/altium-designer/activebom/creating-document

### OrCAD
- BOM生成教程: https://www.ema-eda.com/how-to-page/how-to-generate-a-bom-in-orcad-x-capture/
- Cadence博客: https://resources.pcb.cadence.com/blog/2024-how-to-create-a-bom-file-with-orcad-x

### KiCAD
- KiBoM工具: https://github.com/SchrodingersGat/KiBoM
- BOM脚本: https://github.com/mossmann/kicad-bom-scripts

### 通用
- JLCPCB BOM要求: https://jlcpcb.com/help/article/bill-of-materials-for-pcb-assembly
