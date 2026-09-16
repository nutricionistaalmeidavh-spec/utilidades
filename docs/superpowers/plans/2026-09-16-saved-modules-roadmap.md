# Saved Modules Integration Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the 57 newly saved upstreams into 36 clear ArtiSys integration targets, each with a stable contract, tests, example and documented license boundary.

**Architecture:** Upstreams remain references/dependencies behind ArtiSys-owned contracts. Planned modules are kept outside the canonical implemented-module catalog until code, manifest, tests and verification exist. Existing modules are extended instead of duplicated.

**Tech Stack:** Node.js 22+ where applicable, protocol-specific upstreams behind adapters, existing ArtiSys module conventions, JSON catalogs, Markdown documentation.

**Spec:** `docs/superpowers/specs/2026-09-16-saved-modules-integration-design.md`

## Global Constraints

- Core obrigatório: R$ 0 / self-hosted / open source.
- Serviços pagos podem ser somente opcionais, explícitos e substituíveis.
- GPL/AGPL não pode ser vendorizado no core proprietário; usar serviço/processo/firmware externo ou clean-room.
- Licenças mistas exigem auditoria por componente/arquivo.
- Não duplicar módulos existentes; `artisys-pdf` e `artisys-security` recebem extensões.
- Um módulo só migra para `catalog/modules.json` quando código, manifesto, testes, README, licença local e verificação existirem.
- Woodpecker, `act` e a evolução do pipeline CI pertencem às entregas posteriores a esta.

---

### artisys-device-firmware — Firmware e Provisionamento de Dispositivos
**Upstreams:** 152 `esphome/esphome`, 153 `arendst/Tasmota`, 193 `espressif/esp-idf`.
- [ ] Definir contrato neutro de target, firmware, configuração, build e flash.
- [ ] Criar adapter ESP-IDF e adapters de processo para ESPHome/Tasmota, sem incorporar runtime GPL ao core.
- [ ] Criar fixtures de ESP32, manifestos, hashes e testes de build/flash simulados; smoke em hardware real opcional.
- [ ] Entregar CLI prepare/build/flash, documentação de OTA/rollback e exemplo de integração.

### artisys-iot-flows — Fluxos e Automações IoT
**Upstream:** 158 `node-red/node-red`.
- [ ] Definir DSL de trigger, condição, ação, retry, timeout e auditoria.
- [ ] Criar executor local mínimo e adapter opcional para Node-RED.
- [ ] Testar serialização, idempotência, falhas, retries e prevenção de loops.
- [ ] Entregar exemplos device→evento→ação e integração com `artisys-eventbus`/`artisys-alerts`.

### artisys-zigbee — Integração Zigbee
**Upstream:** 160 `Koenkk/zigbee2mqtt`.
- [ ] Definir contratos de coordinator, discovery, interview, state e command.
- [ ] Criar adapter Zigbee2MQTT por processo/MQTT, sem incorporar código GPL.
- [ ] Adicionar simulador/fixtures e testes de reconnect, availability e comandos.
- [ ] Entregar exemplo opcional com coordenador real e guia de pareamento.

### artisys-matter — Integração Matter
**Upstreams:** 165 `project-chip/connectedhomeip`, 166 `matter-js/matter.js`, 167 `Luligu/matterbridge`.
- [ ] Definir contratos de commissioning, fabric, device, cluster e command.
- [ ] Implementar primeiro adapter TypeScript sobre matter.js; connectedhomeip fica como opção nativa.
- [ ] Testar commissioning simulado, leitura/escrita, reconexão e erros de sessão.
- [ ] Entregar exemplo web/desktop e bridge opcional via Matterbridge.

### artisys-mqtt-broker — Broker e Transporte MQTT
**Upstream:** 168 `eclipse-mosquitto/mosquitto`.
- [ ] Definir endpoint, topics, QoS, retained messages e health.
- [ ] Criar launcher/adapter opcional Mosquitto e cliente desacoplado do broker.
- [ ] Testar pub/sub, reconnect, políticas e falha do broker.
- [ ] Entregar perfil local de produto e documentação sem serviço pago.

### artisys-iot-platform — Plataforma de Dispositivos IoT
**Upstreams:** 177 `thingsboard/thingsboard`, 178 `thingsboard/thingsboard-gateway`, 179 `openremote/openremote`.
- [ ] Definir interface comum de registry, telemetry, commands e rules.
- [ ] Criar adapters ThingsBoard/Gateway e manter OpenRemote isolado como serviço.
- [ ] Criar contract tests com mocks e import/export de dispositivos.
- [ ] Entregar exemplo de produto conectado sem plataforma externa obrigatória.

### artisys-plc — Integração com PLCs
**Upstreams:** 186 `apache/plc4x`, 218 `libplctag/libplctag`.
- [ ] Definir endpoint, tag, read/write, datatype e quality.
- [ ] Criar adapter PLC4X e wrapper separado para libplctag.
- [ ] Testar simuladores, timeout, reconnect, endianess e proteções de escrita.
- [ ] Entregar exemplos Modbus/Allen-Bradley e política de escrita perigosa.

### artisys-scada — SCADA e Supervisão
**Upstream:** 187 `frangoteam/FUXA`.
- [ ] Definir modelo próprio de pontos, telas, alarmes e histórico.
- [ ] Criar conector de serviço FUXA e ligação com `artisys-dashboard`.
- [ ] Testar tags, alarmes, desconexões e atualização de estado.
- [ ] Entregar painel industrial de referência e guia de implantação.

### artisys-lorawan — Integração LoRaWAN
**Upstreams:** 191 `TheThingsNetwork/lorawan-stack`, 192 `chirpstack/chirpstack`.
- [ ] Definir tenant, application, device, gateway, uplink e downlink.
- [ ] Criar adapters The Things Stack e ChirpStack.
- [ ] Testar codecs, deduplicação, downlink, retry, webhook e MQTT.
- [ ] Entregar exemplo agro/telemetria e configuração self-hosted.

### artisys-gps-tracking — Rastreamento GPS e Frotas
**Upstream:** 200 `traccar/traccar`.
- [ ] Definir device, position, trip, geofence e alert.
- [ ] Criar adapter REST/WebSocket para Traccar.
- [ ] Testar coordenadas, eventos atrasados, offline e geofences.
- [ ] Entregar exemplo de frota, mapa e relatórios.

### artisys-thread — Rede Thread
**Upstreams:** 207 `openthread/openthread`, 208 `openthread/ot-br-posix`.
- [ ] Definir border-router, dataset, node e status de rede.
- [ ] Criar adapters OpenThread e launcher opcional OTBR.
- [ ] Testar dataset, attach/detach e health do border router.
- [ ] Entregar guia Thread↔Matter e exemplo com Raspberry Pi.

### artisys-modbus — Integração Modbus
**Upstreams:** 213 `stephane/libmodbus`, 216 `espressif/esp-modbus`.
- [ ] Definir TCP/RTU, unit, register, datatype e leitura/escrita.
- [ ] Implementar adapter ESP-Modbus e wrapper separado para libmodbus.
- [ ] Testar coils/registers, endianess, timeout, retry e validação de escrita.
- [ ] Entregar simulador e exemplos de sensor, inversor e PLC.

### artisys-lwm2m — Gerenciamento LwM2M
**Upstream:** 219 `eclipse-leshan/leshan`.
- [ ] Definir bootstrap, registration, object, resource e command.
- [ ] Criar adapter Leshan como serviço, preferindo caminho BSD quando aplicável.
- [ ] Testar lifecycle, observe, read/write e expiração.
- [ ] Entregar exemplo de provisionamento e inventário.

### artisys-zwave — Integração Z-Wave
**Upstream:** 221 `zwave-js/zwave-js`.
- [ ] Definir controller, node, interview, value e command.
- [ ] Criar adapter zwave-js.
- [ ] Testar inclusion/exclusion, heal, discovery e comandos.
- [ ] Entregar exemplo com controlador USB e documentação de segurança.

### artisys-rf433 — Sensores RF 433/868/915
**Upstream:** 226 `merbanan/rtl_433`.
- [ ] Definir payload normalizado de sensor RF, source e metadata.
- [ ] Criar adapter de processo rtl_433 sem incorporar código GPL.
- [ ] Testar parsing, deduplicação, filtros e entradas gravadas.
- [ ] Entregar exemplo de sensores de temperatura/porta e ponte MQTT/eventbus.

### artisys-universal-gateway — Gateway Universal de Dispositivos
**Upstream:** 228 `1technophile/OpenMQTTGateway`.
- [ ] Definir capabilities, inputs, outputs e roteamento.
- [ ] Criar adapter para OpenMQTTGateway como firmware/serviço externo.
- [ ] Testar mensagens MQTT gravadas, descoberta e normalização.
- [ ] Entregar perfis/documentação para ESP32 BLE/RF/IR/LoRa.

### artisys-presence — Presença e Localização Interna
**Upstream:** 229 `ESPresense/ESPresense`.
- [ ] Definir beacon/device, room, confidence e lastSeen.
- [ ] Criar adapter MQTT para ESPresense com firmware AGPL isolado.
- [ ] Testar smoothing, ausência, mudança de sala e eventos fora de ordem.
- [ ] Entregar exemplo de automação por presença integrado ao eventbus.

### artisys-digital-twin — Gêmeo Digital
**Upstream:** 231 `eclipse-ditto/ditto`.
- [ ] Definir desired/reported state, metadata e revision.
- [ ] Criar storage local mínimo e adapter opcional para Ditto.
- [ ] Testar merge, conflitos, optimistic concurrency e commands.
- [ ] Entregar fluxo device↔twin↔UI integrado ao eventbus.

### artisys-ota — Atualização Remota de Dispositivos
**Upstreams:** 233 `mendersoftware/mender`, 237 `rauc/rauc`.
- [ ] Definir artifact, version, target, rollout, status e rollback.
- [ ] Criar adapters separados para Mender e RAUC.
- [ ] Testar assinatura/hash, interrupção, rollback e compatibilidade.
- [ ] Entregar rollout controlado e integração futura com `artisys-release`.

### artisys-edge-runtime — Runtime Edge
**Upstream:** 240 `edgexfoundry/edgex-go`.
- [ ] Definir service registry, device adapter, telemetry e health.
- [ ] Criar integração opcional com EdgeX.
- [ ] Testar adapters falsos, restart, buffering e health.
- [ ] Entregar exemplo de gateway local ponteando dispositivos para produto.

### artisys-edge-bus — Mensageria Edge
**Upstream:** 243 `eclipse-zenoh/zenoh`.
- [ ] Definir pub/sub, request/reply, discovery e buffer offline.
- [ ] Criar adapter Zenoh preferindo a trilha Apache.
- [ ] Testar reconnect, backpressure, routing e serialização.
- [ ] Entregar integração com `artisys-eventbus`.

### artisys-energy — Energia e Medição
**Upstreams:** 246 `OpenEnergyMonitor/emoncms`, 247 `OpenEMS/openems`.
- [ ] Definir meter, channel, sample, tariff, source e aggregation.
- [ ] Criar adapters de serviço para Emoncms/OpenEMS sem incorporar UI AGPL.
- [ ] Testar agregação, lacunas, importação e tarifas.
- [ ] Entregar exemplo solar/bateria/consumo integrado ao reporting.

### artisys-radio — Comunicação por Rádio
**Upstream:** 248 `jgromes/RadioLib`.
- [ ] Definir radio driver, frequency, modulation, packet e RSSI.
- [ ] Criar wrapper embarcado compatível/inspirado em RadioLib.
- [ ] Testar encode/decode e validação de configuração.
- [ ] Entregar firmware/exemplo mínimo para ESP32.

### artisys-canbus — CAN Bus e Telemetria Veicular
**Upstream:** 249 `linux-can/can-utils`.
- [ ] Definir frame, signal, transport, filter e diagnostic.
- [ ] Criar adapter de processo; copiar somente arquivos permissivos após auditoria individual.
- [ ] Testar parsing, filtros, ISO-TP/J1939 e replay de frames.
- [ ] Entregar exemplo para veículos e máquinas.

### artisys-observability — Observabilidade de Sistemas
**Upstream:** 340 `coroot/coroot`.
- [ ] Definir metric, log, trace, health e SLO em contrato neutro.
- [ ] Criar adapter opcional Coroot e alinhamento a OpenTelemetry.
- [ ] Testar correlação, redaction e falha do backend.
- [ ] Entregar perfil de desenvolvimento/dashboard sem serviço obrigatório.

### artisys-pdf — Extensão de PDF existente
**Upstream:** 342 `Stirling-Tools/Stirling-PDF`.
- [ ] Inventariar capacidades ainda ausentes no `artisys-pdf`.
- [ ] Reimplementar capacidades genéricas ou usar apenas componentes MIT auditados; excluir partes restritas.
- [ ] Adicionar testes para merge, split, compressão/conversão selecionadas.
- [ ] Atualizar exemplos e matriz de compatibilidade sem dependência paga.

### artisys-signatures — Assinaturas Eletrônicas
**Upstreams:** 343 `documenso/documenso`, 344 `docusealco/docuseal`.
- [ ] Definir envelope, template, signer, field, evidence e status.
- [ ] Criar adapters HTTP mantendo os serviços AGPL externos.
- [ ] Testar lifecycle, webhooks, idempotência e evidence com mocks.
- [ ] Entregar estado local mínimo e exemplos opt-in self-hosted.

### artisys-file-sync — Sincronização de Arquivos
**Upstreams:** 347 `haiwen/seafile`, 349 `syncthing/syncthing`.
- [ ] Definir peer, root, file, version e políticas de conflito.
- [ ] Criar adapters processo/API e reutilizar `artisys-files`/`artisys-sync`.
- [ ] Testar conflitos, rename/delete, offline e segurança de paths.
- [ ] Entregar exemplo de pasta compartilhada e integração opcional com backup.

### artisys-project-management — Gestão de Projetos e Tarefas
**Upstreams:** 351 `makeplane/plane`, 352 `go-vikunja/vikunja`, 353 `Leantime/leantime`.
- [ ] Definir modelo próprio project/board/task/milestone/assignee em clean-room.
- [ ] Compor `artisys-planning`, `artisys-workflow-engine` e `artisys-contacts` com contrato de tarefas.
- [ ] Testar estados, dependências, filtros e permissões.
- [ ] Entregar UI/API de referência e adapters/importadores opcionais.

### artisys-helpdesk — Atendimento e Tickets
**Upstream:** 355 `zammad/zammad`.
- [ ] Definir ticket, requester, agent, queue, SLA, message e status.
- [ ] Implementar core próprio e adapter opcional para Zammad.
- [ ] Testar SLA, transições, anexos, threads e permissões.
- [ ] Entregar exemplo integrado a contacts e alerts.

### artisys-crm — CRM e Relacionamento
**Upstream:** 358 `monicahq/monica`.
- [ ] Definir lead, contact, account, activity, note e reminder sobre `artisys-contacts`.
- [ ] Implementar core próprio usando Monica só como referência/adapter.
- [ ] Testar histórico, deduplicação, filtros e permissões.
- [ ] Entregar exemplo comercial integrado a catálogo/helpdesk.

### artisys-commerce — Pedidos e Comércio
**Upstreams:** 371 `medusajs/medusa`, 372 `saleor/saleor`, 373 `vendurehq/vendure`, 374 `bagisto/bagisto`.
- [ ] Definir order, cart, customer, channel, promotion, tax e shipping.
- [ ] Compor catalog/pricing/inventory com novo core de pedidos e referências permissivas.
- [ ] Testar contrato cart→order→inventory e manter Vendure GPL isolado.
- [ ] Entregar storefront/POS de referência e guia de integração incremental.

### artisys-billing — Assinaturas e Billing
**Upstream:** 377 `killbill/killbill`.
- [ ] Definir plan, subscription, usage, invoice, credit e charge sem processar pagamento.
- [ ] Criar adapter Kill Bill e core mínimo determinístico para ciclos/planos.
- [ ] Testar proration, cancelamento, idempotência e eventos.
- [ ] Entregar integração com `artisys-finance-domain` e exemplo SaaS.

### artisys-security — Extensão de segurança existente
**Upstream:** 388 `aquasecurity/trivy`.
- [ ] Revalidar integração Trivy e definir perfis quick/full/release.
- [ ] Adicionar scanner de licença/SBOM opt-in no mesmo contrato.
- [ ] Testar exit codes, severity thresholds, allowlists e execução offline.
- [ ] Padronizar resultado para `artisys-release` e futuros executores CI.

### artisys-rag — RAG e Conhecimento Local
**Upstream:** 393 `Mintplex-Labs/anything-llm`.
- [ ] Definir documents, chunk, embedding, retrieval, citation e conversation.
- [ ] Criar core independente com adapters de modelo/vetor; AnythingLLM permanece opcional.
- [ ] Testar ingestion, tenant isolation, citations e execução sem provider.
- [ ] Entregar exemplo local configurável sem API paga obrigatória.

### artisys-vector-store — Armazenamento Vetorial
**Upstreams:** 396 `qdrant/qdrant`, 397 `chroma-core/chroma`, 398 `milvus-io/milvus`.
- [ ] Definir interface upsert, query, delete, namespace e health.
- [ ] Criar adapters Qdrant, Chroma e Milvus sem backend obrigatório.
- [ ] Executar contract tests comuns para dimensões, filtros e namespaces.
- [ ] Entregar adapter in-memory e exemplos para `artisys-rag`.

## Definition of Ready comum

Cada módulo só passa de `planned` para implementação consumível quando tiver contrato público documentado, testes automatizados, exemplo executável, limites de licença/runtime documentados e nenhum serviço pago obrigatório para a função básica.
