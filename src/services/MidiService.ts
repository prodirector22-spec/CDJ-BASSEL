/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MidiCallback = (type: string, data: any) => void;

export class MidiService {
  private access: MIDIAccess | null = null;
  private callbacks: MidiCallback[] = [];

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported');
      return;
    }

    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.inputs.forEach(input => {
        input.onmidimessage = this.handleMidiMessage.bind(this);
      });
      
      this.access.onstatechange = (e) => {
        if (e.port.type === 'input' && e.port.state === 'connected') {
          (e.port as MIDIInput).onmidimessage = this.handleMidiMessage.bind(this);
        }
      };
    } catch (err) {
      console.error('Failed to get MIDI access', err);
    }
  }

  onMessage(callback: MidiCallback) {
    this.callbacks.push(callback);
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    const [status, data1, data2] = event.data;
    const type = status & 0xf0;
    const channel = status & 0x0f;

    // Basic MIDI mapping
    // Note On: 0x90, Control Change: 0xB0
    if (type === 0x90 && data2 > 0) {
      this.notify('NOTE_ON', { note: data1, velocity: data2, channel });
    } else if (type === 0xB0) {
      this.notify('CC', { controller: data1, value: data2, channel });
    }
  }

  private notify(type: string, data: any) {
    this.callbacks.forEach(cb => cb(type, data));
  }
}
