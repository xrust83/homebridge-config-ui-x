import { NgClass } from '@angular/common'
import { Component, inject, Input, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { NgbActiveModal, NgbAlert, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom } from 'rxjs'

import { ApiService } from '@/app/core/api.service'
import { RestartHomebridgeComponent } from '@/app/core/components/restart-homebridge/restart-homebridge.component'
import { ManagePluginsService } from '@/app/core/manage-plugins/manage-plugins.service'
import { PluginSchema } from '@/app/core/manage-plugins/plugin-config/plugin-config.component'
import { SettingsService } from '@/app/core/settings.service'

import { QrcodeComponent } from '../../components/qrcode/qrcode.component'

interface DeviceInfo {
  category: number
  configVersion: number
  displayName: string
  lastFirmwareVersion: string
  pincode: string
  setupID: string
  _category: string
  _id: string
  _isPaired: boolean
  _main: boolean
  _setupCode: string
  _username: string
}

@Component({
  templateUrl: './plugin-bridge.component.html',
  styleUrls: ['./plugin-bridge.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgbAlert,
    QrcodeComponent,
    NgClass,
    TranslatePipe,
  ],
})
export class PluginBridgeComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)
  private $api = inject(ApiService)
  private $modal = inject(NgbModal)
  private $plugins = inject(ManagePluginsService)
  private $router = inject(Router)
  $settings = inject(SettingsService)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)

  @Input() plugin: any
  @Input() schema: PluginSchema
  @Input() justInstalled = false

  public canConfigure = true
  public configBlocks: any[] = []
  public enabledBlocks: Record<number, boolean> = {}
  public bridgeCache: Map<number, Record<string, any>> = new Map()
  public originalBridges: any[] = []
  public deviceInfo: Map<string, DeviceInfo | false> = new Map()
  public showConfigFields: boolean[] = []
  public saveInProgress = false
  public canShowBridgeDebug = false
  public deleteBridges: { id: string, bridgeName: string }[] = []

  constructor() {}

  ngOnInit(): void {
    this.loadPluginConfig()
    this.canShowBridgeDebug = this.$settings.env.homebridgeVersion.startsWith('2')
  }

  loadPluginConfig() {
    this.$api.get(`/config-editor/plugin/${encodeURIComponent(this.plugin.name)}`).subscribe({
      next: (configBlocks) => {
        this.configBlocks = configBlocks
        for (const [i, block] of this.configBlocks.entries()) {
          if (block._bridge && block._bridge.username) {
            this.enabledBlocks[i] = true
            block._bridge.env = block._bridge.env || {}
            this.bridgeCache.set(i, block._bridge)
            this.getDeviceInfo(block._bridge.username)
            this.originalBridges.push(block._bridge)
          }
        }

        // If the plugin has just been installed, and there are no existing bridges, enable all blocks
        if (this.justInstalled && this.bridgeCache.size === 0) {
          this.configBlocks.forEach((block, index) => {
            this.enabledBlocks[index] = true
            this.toggleExternalBridge(block, true, index)
          })
        }
      },
      error: (error) => {
        this.canConfigure = false
        console.error(error)
      },
    })
  }

  async toggleExternalBridge(block: any, enable: boolean, index: number) {
    if (!enable) {
      // Store unpaired child bridge id for deletion, so no bridges are orphaned
      const originalBridge = this.originalBridges.find(b => b.username === block._bridge.username)
      if (originalBridge) {
        this.deleteBridges.push({
          id: block._bridge.username,
          bridgeName: block._bridge.name || originalBridge.displayName,
        })
      }

      delete block._bridge
      return
    }

    const bridgeCache = this.bridgeCache.get(index)

    block._bridge = {
      username: bridgeCache ? bridgeCache.username : this.generateUsername(),
      port: await this.getUnusedPort(),
      name: bridgeCache?.name,
      model: bridgeCache?.model,
      manufacturer: bridgeCache?.manufacturer,
      firmwareRevision: bridgeCache?.firmwareRevision,
      debugModeEnabled: bridgeCache?.debugModeEnabled,
      env: bridgeCache?.env,
    }

    if (this.deleteBridges.some(b => b.id === block._bridge.username)) {
      this.deleteBridges = this.deleteBridges.filter(b => b.id !== block._bridge.username)
    }

    this.bridgeCache.set(index, block._bridge)
    await this.getDeviceInfo(block._bridge.username)
  }

  async getUnusedPort() {
    this.saveInProgress = true
    try {
      const lookup = await firstValueFrom(this.$api.get('/server/port/new'))
      return lookup.port
    } catch (e) {
      return Math.floor(Math.random() * (60000 - 30000 + 1) + 30000)
    } finally {
      this.saveInProgress = false
    }
  }

  async getDeviceInfo(username: string) {
    try {
      this.deviceInfo[username] = await firstValueFrom(this.$api.get(`/server/pairings/${username.replace(/:/g, '')}`))
    } catch (error) {
      console.error(error)
      this.deviceInfo[username] = false
    }
  }

  async save() {
    this.saveInProgress = true

    try {
      await firstValueFrom(this.$api.post(`/config-editor/plugin/${encodeURIComponent(this.plugin.name)}`, this.configBlocks))

      // Delete unpaired bridges, so no bridges are orphaned
      for (const bridge of this.deleteBridges) {
        try {
          await firstValueFrom(this.$api.delete(`/server/pairings/${bridge.id.replace(/:/g, '')}`))
        } catch (error) {
          console.error(error)
          this.$toastr.error(this.$translate.instant('settings.unpair_bridge.unpair_error'), this.$translate.instant('toast.title_error'))
        }
      }

      this.$activeModal.close()
      this.$modal.open(RestartHomebridgeComponent, {
        size: 'lg',
        backdrop: 'static',
      })
    } catch (error) {
      console.error(error)
      this.$toastr.error(this.$translate.instant('config.failed_to_save_config'), this.$translate.instant('toast.title_error'))
    } finally {
      this.saveInProgress = false
    }
  }

  openPluginConfig() {
    // Close the existing modal
    this.$activeModal.close()

    // Open the plugin config modal
    this.$plugins.settings({
      name: this.plugin.name,
      settingsSchema: true,
      links: {},
    })
  }

  /**
   * Generates a new random username
   */
  public generateUsername() {
    const hexDigits = '0123456789ABCDEF'
    let username = '0E:'
    for (let i = 0; i < 5; i++) {
      username += hexDigits.charAt(Math.round(Math.random() * 15))
      username += hexDigits.charAt(Math.round(Math.random() * 15))
      if (i !== 4) {
        username += ':'
      }
    }
    return username
  }

  openFullConfigEditor() {
    this.$router.navigate(['/config'])
    this.$activeModal.close()
  }

  toggleConfigFields(index: number) {
    this.showConfigFields[index] = !this.showConfigFields[index]
  }
}
