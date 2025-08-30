import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  beforeEach(() => {
    global.ResizeObserver = vitest.fn().mockImplementation(() => ({
      observe: vitest.fn(),
      unobserve: vitest.fn(),
      disconnect: vitest.fn(),
    }))
  })
  it('mounts renders properly', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('You did it!')
  })
})
