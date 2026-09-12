import { WebEventBus, createDomainEvent } from '../web/index.mjs';

const bus = new WebEventBus();
bus.subscribe('consultation.saved', event => {
  console.log(`Atualizar prontuário do paciente ${event.payload.patientId}`);
});
bus.once('document.generated', event => {
  console.log(`Documento pronto: ${event.payload.documentId}`);
});

await bus.publishAsync(createDomainEvent({
  eventId: 'example-consultation-1',
  type: 'consultation.saved',
  aggregate: 'consultation',
  aggregateId: 'consultation-1',
  source: 'debora-web',
  actor: { id: 'professional-1' },
  payload: { patientId: 'patient-1' }
}));
