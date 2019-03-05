describe('Assertions', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.text('Assertions')).tap();
  });

  it('should assert an element is visible', async () => {
    await expect(element(by.id('UniqueId204'))).toBeVisible();
  });

  it('should assert an element is not visible', async () => {
    await expect(element(by.id('UniqueId205'))).toBeNotVisible();
  });

  // prefer toBeVisible to make sure the user actually sees this element
  it('should assert an element exists', async () => {
    await expect(element(by.id('UniqueId205'))).toExist();
  });

  it('should assert an element does not exist', async () => {
    await expect(element(by.id('RandomJunk959'))).toNotExist();
  });

  // matches specific text elements like UIButton, UILabel, UITextField or UITextView, RCTText
  it('should assert an element has text', async () => {
    await expect(element(by.id('UniqueId204'))).toHaveText('I contain some text');
  });

  // matches by accessibility label, this might not be the specific displayed text but is much more generic
  it('should assert an element has (accessibility) label', async () => {
    await expect(element(by.id('UniqueId204'))).toHaveLabel('I contain some text');
  });

  it('should assert an element has (accessibility) id', async () => {
    await expect(element(by.text('I contain some text'))).toHaveId('UniqueId204');
  });

  // for example, the value of a UISwitch in the "on" state is "1"
  it(':ios: should assert an element has (accessibility) value', async () => {
    await expect(element(by.id('UniqueId146'))).toHaveValue('0');
    await element(by.id('UniqueId146')).tap();
    await expect(element(by.id('UniqueId146'))).toHaveValue('1');
  });
});
