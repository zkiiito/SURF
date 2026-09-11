export const describeReact = Cypress.env('CLIENT_VERSION') === 'backbone' ? describe.skip : describe
export const me = { _id: '600000000000000000000001', name: 'Alice', avatar: 'head1', status: 'online' }
export const bob = { _id: '600000000000000000000002', name: 'Bob', avatar: 'head2', status: 'online', email: 'bo..@example.com' }
export const waveA = { _id: '600000000000000000000011', title: 'Wave A', userIds: [me._id, bob._id] }
export const waveB = { _id: '600000000000000000000012', title: 'Wave B', userIds: [me._id] }
export const message = (id, overrides = {}) => ({
  _id: `600000000000000000000${id.toString(16).padStart(3, '0')}`,
  waveId: waveA._id, userId: bob._id, message: `Message ${id}`,
  parentId: null, created_at: Date.now(), unread: false, ...overrides,
})

let scenarioVisit = 0
export function visitScenario(overrides = {}, options = {}, route = `/wave/${waveA._id}`) {
  return cy.task('react:reset', { me, users: [bob], waves: [waveA, waveB], messages: [], ...overrides })
    .then(url => cy.visit(`${url}/?scenario=${++scenarioVisit}#${route}`, options))
}

export const rootForm = '.waves-container > .replyform form'
export function pickImage(name = 'draft.png') {
  cy.get(`${rootForm} input[type=file]`).selectFile({
    contents: Cypress.Buffer.from('image for draft test'), fileName: name, mimeType: 'image/png',
  }, { force: true })
}
