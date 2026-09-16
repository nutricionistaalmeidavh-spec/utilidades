# Revisão de licenças dos upstreams salvos — 2026-09-16

Esta revisão é a **Entrega 4** do lote de novos repositórios salvos. Ela define a fronteira técnica permitida antes de qualquer incorporação de código.

## Regra de decisão

- **baixo:** licença permissiva; integração `embedded`/`adapter` é possível com atribuições.
- **médio:** copyleft fraco, dual-license ou obrigações por arquivo; manter fronteira explícita.
- **alto:** GPL/AGPL, licença mista/restrita ou componentes heterogêneos; não vender código upstream dentro do core proprietário. Usar serviço/processo/firmware externo ou clean-room.
- `service` neste documento significa **opcional/self-hosted**, nunca dependência silenciosa do produto.
- Qualquer atualização de upstream ou mudança de SHA exige nova revisão.

## Matriz

| # | Repositório | Licença observada | Risco | Modo | Módulo alvo | Decisão |
|---:|---|---|---|---|---|---|
| 152 | `esphome/esphome` | mixed: MIT/GPL-3.0 by component | **high** | `adapter` | `artisys-device-firmware` | Adapter/per-file audit; do not vendor GPL runtime into proprietary core. |
| 153 | `arendst/Tasmota` | GPL-3.0 | **high** | `adapter` | `artisys-device-firmware` | External firmware/service only; no vendoring into proprietary core. |
| 158 | `node-red/node-red` | Apache-2.0 | **low** | `adapter` | `artisys-iot-flows` | Adapter or service; permissive upstream. |
| 160 | `Koenkk/zigbee2mqtt` | GPL-3.0 | **high** | `service` | `artisys-zigbee` | External service/process adapter only. |
| 165 | `project-chip/connectedhomeip` | Apache-2.0 | **low** | `adapter` | `artisys-matter` | Native adapter permitted with notices. |
| 166 | `matter-js/matter.js` | Apache-2.0 | **low** | `embedded` | `artisys-matter` | Preferred TypeScript embedded adapter. |
| 167 | `Luligu/matterbridge` | Apache-2.0 | **low** | `adapter` | `artisys-matter` | Optional bridge adapter. |
| 168 | `eclipse-mosquitto/mosquitto` | EPL-2.0 OR BSD-3-Clause | **medium** | `service` | `artisys-mqtt-broker` | Prefer BSD-3-Clause path where applicable; run as external broker. |
| 177 | `thingsboard/thingsboard` | Apache-2.0 | **low** | `service` | `artisys-iot-platform` | External optional platform adapter. |
| 178 | `thingsboard/thingsboard-gateway` | Apache-2.0 | **low** | `adapter` | `artisys-iot-platform` | Optional gateway adapter. |
| 179 | `openremote/openremote` | AGPL-3.0-or-later | **high** | `service` | `artisys-iot-platform` | Service/reference only; no code vendoring. |
| 186 | `apache/plc4x` | Apache-2.0 | **low** | `adapter` | `artisys-plc` | Adapter/library use permitted with notices. |
| 187 | `frangoteam/FUXA` | MIT | **low** | `service` | `artisys-scada` | Optional service/reference; permissive license. |
| 191 | `TheThingsNetwork/lorawan-stack` | Apache-2.0 | **low** | `service` | `artisys-lorawan` | Optional service adapter. |
| 192 | `chirpstack/chirpstack` | MIT | **low** | `service` | `artisys-lorawan` | Optional service adapter. |
| 193 | `espressif/esp-idf` | Apache-2.0 core; third-party components vary | **medium** | `embedded` | `artisys-device-firmware` | Use core with per-component license audit. |
| 200 | `traccar/traccar` | Apache-2.0 | **low** | `service` | `artisys-gps-tracking` | Optional tracking service adapter. |
| 207 | `openthread/openthread` | BSD-3-Clause | **low** | `embedded` | `artisys-thread` | Embedded/native adapter permitted. |
| 208 | `openthread/ot-br-posix` | BSD-3-Clause | **low** | `service` | `artisys-thread` | Optional gateway service. |
| 213 | `stephane/libmodbus` | LGPL-2.1-or-later | **medium** | `adapter` | `artisys-modbus` | Keep library boundary/dynamic linking where distributed. |
| 216 | `espressif/esp-modbus` | Apache-2.0 | **low** | `embedded` | `artisys-modbus` | Preferred embedded ESP adapter. |
| 218 | `libplctag/libplctag` | MPL-2.0 OR LGPL-2.0-or-later | **medium** | `adapter` | `artisys-plc` | Keep separate library boundary and notices. |
| 219 | `eclipse-leshan/leshan` | EPL-2.0 OR BSD-3-Clause | **medium** | `service` | `artisys-lwm2m` | Prefer BSD path when possible; service adapter. |
| 221 | `zwave-js/zwave-js` | MIT | **low** | `embedded` | `artisys-zwave` | Embedded adapter permitted. |
| 226 | `merbanan/rtl_433` | GPL-2.0 | **high** | `adapter` | `artisys-rf433` | External process adapter only. |
| 228 | `1technophile/OpenMQTTGateway` | GPL-3.0 | **high** | `service` | `artisys-universal-gateway` | External firmware/service only. |
| 229 | `ESPresense/ESPresense` | AGPL-3.0 | **high** | `service` | `artisys-presence` | External firmware/service only. |
| 231 | `eclipse-ditto/ditto` | EPL-2.0 | **medium** | `service` | `artisys-digital-twin` | Service adapter; keep EPL boundary. |
| 233 | `mendersoftware/mender` | Apache-2.0 | **low** | `service` | `artisys-ota` | Optional OTA service adapter. |
| 237 | `rauc/rauc` | LGPL-2.1-or-later | **medium** | `adapter` | `artisys-ota` | External tool/library boundary. |
| 240 | `edgexfoundry/edgex-go` | Apache-2.0 | **low** | `service` | `artisys-edge-runtime` | Optional edge service adapter. |
| 243 | `eclipse-zenoh/zenoh` | Apache-2.0 AND/OR EPL-2.0 | **medium** | `adapter` | `artisys-edge-bus` | Prefer Apache-compatible distribution path; keep license notices. |
| 246 | `OpenEnergyMonitor/emoncms` | AGPL-3.0 | **high** | `service` | `artisys-energy` | External service only. |
| 247 | `OpenEMS/openems` | mixed: EPL-2.0 backend/edge; AGPL-3.0 UI | **high** | `service` | `artisys-energy` | External service/adapters; no UI vendoring. |
| 248 | `jgromes/RadioLib` | MIT | **low** | `embedded` | `artisys-radio` | Embedded wrapper permitted. |
| 249 | `linux-can/can-utils` | mixed per-file, often GPL-2.0-only OR BSD-3-Clause | **high** | `adapter` | `artisys-canbus` | Process adapter by default; copy only individually audited permissive files. |
| 340 | `coroot/coroot` | Apache-2.0 | **low** | `service` | `artisys-observability` | Optional observability service adapter. |
| 342 | `Stirling-Tools/Stirling-PDF` | mixed: MIT root plus restricted engine/components | **high** | `adapter` | `artisys-pdf` | Audit by path; exclude restricted engine/commercial components from core. |
| 343 | `documenso/documenso` | AGPL-3.0 | **high** | `service` | `artisys-signatures` | External service/API adapter only. |
| 344 | `docusealco/docuseal` | AGPL-3.0 with additional terms | **high** | `service` | `artisys-signatures` | External service/API adapter only. |
| 347 | `haiwen/seafile` | mixed: GPL/AGPL/Apache by component | **high** | `service` | `artisys-file-sync` | External service/process adapters only. |
| 349 | `syncthing/syncthing` | MPL-2.0 | **medium** | `service` | `artisys-file-sync` | Prefer process/API adapter; preserve MPL obligations. |
| 351 | `makeplane/plane` | AGPL-3.0-only with component-specific notices | **high** | `service` | `artisys-project-management` | Reference/service adapter; clean-room own domain model. |
| 352 | `go-vikunja/vikunja` | AGPL-3.0-or-later | **high** | `service` | `artisys-project-management` | Reference/service adapter only. |
| 353 | `Leantime/leantime` | AGPL-3.0 with plugin exceptions | **high** | `service` | `artisys-project-management` | Reference/service adapter only. |
| 355 | `zammad/zammad` | AGPL-3.0 | **high** | `service` | `artisys-helpdesk` | External service/API adapter only. |
| 358 | `monicahq/monica` | AGPL-3.0 | **high** | `service` | `artisys-crm` | Reference/service adapter; own clean-room core. |
| 371 | `medusajs/medusa` | MIT | **low** | `adapter` | `artisys-commerce` | Reference/adapter and permissive code reuse with notices. |
| 372 | `saleor/saleor` | BSD-3-Clause | **low** | `adapter` | `artisys-commerce` | Reference/adapter; permissive reuse possible. |
| 373 | `vendurehq/vendure` | GPL-3.0 with plugin exception/commercial option | **high** | `service` | `artisys-commerce` | Service/reference only; canonical repo moved from vendure-ecommerce/vendure. |
| 374 | `bagisto/bagisto` | MIT | **low** | `adapter` | `artisys-commerce` | Reference/adapter and permissive reuse with notices. |
| 377 | `killbill/killbill` | Apache-2.0 | **low** | `service` | `artisys-billing` | Optional service adapter. |
| 388 | `aquasecurity/trivy` | Apache-2.0 | **low** | `dev-tool` | `artisys-security` | Existing upstream: extend security profiles, no new module. |
| 393 | `Mintplex-Labs/anything-llm` | MIT | **low** | `service` | `artisys-rag` | Optional service/reference; own provider-agnostic core. |
| 396 | `qdrant/qdrant` | Apache-2.0 | **low** | `service` | `artisys-vector-store` | Optional backend adapter. |
| 397 | `chroma-core/chroma` | Apache-2.0 | **low** | `service` | `artisys-vector-store` | Optional backend adapter. |
| 398 | `milvus-io/milvus` | Apache-2.0 | **low** | `service` | `artisys-vector-store` | Optional backend adapter. |

## Casos que exigem atenção especial

- **ESPHome (152):** o repositório mistura componentes/licenças; tratar firmware/runtime GPL separado do código permissivo e auditar por caminho.
- **OpenEMS (247):** backend/edge e UI têm obrigações diferentes; a UI AGPL não deve ser incorporada ao produto proprietário.
- **can-utils (249):** a licença varia por arquivo; o modo padrão é adapter de processo. Só copiar um arquivo após auditoria individual.
- **Stirling-PDF (342):** há componentes com termos distintos do núcleo permissivo. O `artisys-pdf` só poderá absorver capacidades reimplementadas ou componentes explicitamente auditados como compatíveis.
- **Seafile (347):** componentes de cliente/servidor têm licenças diferentes; manter integração como serviço/processo.
- **Plane (351):** tratar o projeto completo como referência/serviço de copyleft forte; o domínio ArtiSys deve ser implementado de forma independente.
- **Vendure (373):** o repositório canônico atual é `vendurehq/vendure`; GPL-3.0 com exceções específicas não autoriza incorporação geral ao core proprietário.

Esta é uma política de engenharia e não substitui aconselhamento jurídico.
