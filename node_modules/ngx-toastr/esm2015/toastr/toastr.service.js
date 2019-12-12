import * as tslib_1 from "tslib";
import { ComponentRef, Inject, Injectable, Injector, NgZone, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Overlay } from '../overlay/overlay';
import { ComponentPortal } from '../portal/portal';
import { ToastInjector, ToastRef } from './toast-injector';
import { ToastPackage, TOAST_CONFIG } from './toastr-config';
import * as i0 from "@angular/core";
import * as i1 from "./toastr-config";
import * as i2 from "../overlay/overlay";
import * as i3 from "@angular/platform-browser";
let ToastrService = class ToastrService {
    constructor(token, overlay, _injector, sanitizer, ngZone) {
        this.overlay = overlay;
        this._injector = _injector;
        this.sanitizer = sanitizer;
        this.ngZone = ngZone;
        this.currentlyActive = 0;
        this.toasts = [];
        this.index = 0;
        this.toastrConfig = Object.assign({}, token.default, token.config);
        if (token.config.iconClasses) {
            this.toastrConfig.iconClasses = Object.assign({}, token.default.iconClasses, token.config.iconClasses);
        }
    }
    /** show toast */
    show(message, title, override = {}, type = '') {
        return this._preBuildNotification(type, message, title, this.applyConfig(override));
    }
    /** show successful toast */
    success(message, title, override = {}) {
        const type = this.toastrConfig.iconClasses.success || '';
        return this._preBuildNotification(type, message, title, this.applyConfig(override));
    }
    /** show error toast */
    error(message, title, override = {}) {
        const type = this.toastrConfig.iconClasses.error || '';
        return this._preBuildNotification(type, message, title, this.applyConfig(override));
    }
    /** show info toast */
    info(message, title, override = {}) {
        const type = this.toastrConfig.iconClasses.info || '';
        return this._preBuildNotification(type, message, title, this.applyConfig(override));
    }
    /** show warning toast */
    warning(message, title, override = {}) {
        const type = this.toastrConfig.iconClasses.warning || '';
        return this._preBuildNotification(type, message, title, this.applyConfig(override));
    }
    /**
     * Remove all or a single toast by id
     */
    clear(toastId) {
        // Call every toastRef manualClose function
        for (const toast of this.toasts) {
            if (toastId !== undefined) {
                if (toast.toastId === toastId) {
                    toast.toastRef.manualClose();
                    return;
                }
            }
            else {
                toast.toastRef.manualClose();
            }
        }
    }
    /**
     * Remove and destroy a single toast by id
     */
    remove(toastId) {
        const found = this._findToast(toastId);
        if (!found) {
            return false;
        }
        found.activeToast.toastRef.close();
        this.toasts.splice(found.index, 1);
        this.currentlyActive = this.currentlyActive - 1;
        if (!this.toastrConfig.maxOpened || !this.toasts.length) {
            return false;
        }
        if (this.currentlyActive < this.toastrConfig.maxOpened &&
            this.toasts[this.currentlyActive]) {
            const p = this.toasts[this.currentlyActive].toastRef;
            if (!p.isInactive()) {
                this.currentlyActive = this.currentlyActive + 1;
                p.activate();
            }
        }
        return true;
    }
    /**
     * Determines if toast message is already shown
     */
    findDuplicate(message, resetOnDuplicate, countDuplicates) {
        for (const toast of this.toasts) {
            if (toast.message === message) {
                toast.toastRef.onDuplicate(resetOnDuplicate, countDuplicates);
                return toast;
            }
        }
        return null;
    }
    /** create a clone of global config and apply individual settings */
    applyConfig(override = {}) {
        return Object.assign({}, this.toastrConfig, override);
    }
    /**
     * Find toast object by id
     */
    _findToast(toastId) {
        for (let i = 0; i < this.toasts.length; i++) {
            if (this.toasts[i].toastId === toastId) {
                return { index: i, activeToast: this.toasts[i] };
            }
        }
        return null;
    }
    /**
     * Determines the need to run inside angular's zone then builds the toast
     */
    _preBuildNotification(toastType, message, title, config) {
        if (config.onActivateTick) {
            return this.ngZone.run(() => this._buildNotification(toastType, message, title, config));
        }
        return this._buildNotification(toastType, message, title, config);
    }
    /**
     * Creates and attaches toast data to component
     * returns the active toast, or in case preventDuplicates is enabled the original/non-duplicate active toast.
     */
    _buildNotification(toastType, message, title, config) {
        if (!config.toastComponent) {
            throw new Error('toastComponent required');
        }
        // max opened and auto dismiss = true
        // if timeout = 0 resetting it would result in setting this.hideTime = Date.now(). Hence, we only want to reset timeout if there is
        // a timeout at all
        const duplicate = this.findDuplicate(message, this.toastrConfig.resetTimeoutOnDuplicate && config.timeOut > 0, this.toastrConfig.countDuplicates);
        if (message && this.toastrConfig.preventDuplicates && duplicate !== null) {
            return duplicate;
        }
        this.previousToastMessage = message;
        let keepInactive = false;
        if (this.toastrConfig.maxOpened &&
            this.currentlyActive >= this.toastrConfig.maxOpened) {
            keepInactive = true;
            if (this.toastrConfig.autoDismiss) {
                this.clear(this.toasts[0].toastId);
            }
        }
        const overlayRef = this.overlay.create(config.positionClass, this.overlayContainer);
        this.index = this.index + 1;
        let sanitizedMessage = message;
        if (message && config.enableHtml) {
            sanitizedMessage = this.sanitizer.sanitize(SecurityContext.HTML, message);
        }
        const toastRef = new ToastRef(overlayRef);
        const toastPackage = new ToastPackage(this.index, config, sanitizedMessage, title, toastType, toastRef);
        const toastInjector = new ToastInjector(toastPackage, this._injector);
        const component = new ComponentPortal(config.toastComponent, toastInjector);
        const portal = overlayRef.attach(component, this.toastrConfig.newestOnTop);
        toastRef.componentInstance = portal._component;
        const ins = {
            toastId: this.index,
            message: message || '',
            toastRef,
            onShown: toastRef.afterActivate(),
            onHidden: toastRef.afterClosed(),
            onTap: toastPackage.onTap(),
            onAction: toastPackage.onAction(),
            portal
        };
        if (!keepInactive) {
            setTimeout(() => {
                ins.toastRef.activate();
                this.currentlyActive = this.currentlyActive + 1;
            });
        }
        this.toasts.push(ins);
        return ins;
    }
};
ToastrService.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Inject, args: [TOAST_CONFIG,] }] },
    { type: Overlay },
    { type: Injector },
    { type: DomSanitizer },
    { type: NgZone }
];
ToastrService.ngInjectableDef = i0.ɵɵdefineInjectable({ factory: function ToastrService_Factory() { return new ToastrService(i0.ɵɵinject(i1.TOAST_CONFIG), i0.ɵɵinject(i2.Overlay), i0.ɵɵinject(i0.INJECTOR), i0.ɵɵinject(i3.DomSanitizer), i0.ɵɵinject(i0.NgZone)); }, token: ToastrService, providedIn: "root" });
ToastrService = tslib_1.__decorate([
    Injectable({ providedIn: 'root' }),
    tslib_1.__param(0, Inject(TOAST_CONFIG)),
    tslib_1.__metadata("design:paramtypes", [Object, Overlay,
        Injector,
        DomSanitizer,
        NgZone])
], ToastrService);
export { ToastrService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9hc3RyLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9uZ3gtdG9hc3RyLyIsInNvdXJjZXMiOlsidG9hc3RyL3RvYXN0ci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUNaLE1BQU0sRUFDTixVQUFVLEVBQ1YsUUFBUSxFQUNSLE1BQU0sRUFDTixlQUFlLEVBQ2hCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUl6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFM0QsT0FBTyxFQUFrQyxZQUFZLEVBQWMsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7Ozs7O0FBc0J6RyxJQUFhLGFBQWEsR0FBMUIsTUFBYSxhQUFhO0lBUXhCLFlBQ3dCLEtBQWlCLEVBQy9CLE9BQWdCLEVBQ2hCLFNBQW1CLEVBQ25CLFNBQXVCLEVBQ3ZCLE1BQWM7UUFIZCxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbkIsY0FBUyxHQUFULFNBQVMsQ0FBYztRQUN2QixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBWHhCLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLFdBQU0sR0FBdUIsRUFBRSxDQUFDO1FBR3hCLFVBQUssR0FBRyxDQUFDLENBQUM7UUFTaEIsSUFBSSxDQUFDLFlBQVkscUJBQ1osS0FBSyxDQUFDLE9BQU8sRUFDYixLQUFLLENBQUMsTUFBTSxDQUNoQixDQUFDO1FBQ0YsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtZQUM1QixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcscUJBQ3hCLEtB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WTtZQUNILE9BQU87WUFDTCxRQUFRO1lBQ1IsWUFBWTtZQUNmLE1BQU07OztBQWJiLGFBQWE7SUFEekIsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBVTlCLG1CQUFBLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtxREFDSixPQUFPO1FBQ0wsUUFBUTtRQUNSLFlBQVk7UUFDZixNQUFNO0dBYmIsYUFBYSxDQTZRekI7U0E3UVksYUFBYSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudFJlZixcbiAgSW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBJbmplY3RvcixcbiAgTmdab25lLFxuICBTZWN1cml0eUNvbnRleHRcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBEb21TYW5pdGl6ZXIgfSBmcm9tICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJztcblxuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQgeyBPdmVybGF5IH0gZnJvbSAnLi4vb3ZlcmxheS9vdmVybGF5JztcbmltcG9ydCB7IENvbXBvbmVudFBvcnRhbCB9IGZyb20gJy4uL3BvcnRhbC9wb3J0YWwnO1xuaW1wb3J0IHsgVG9hc3RJbmplY3RvciwgVG9hc3RSZWYgfSBmcm9tICcuL3RvYXN0LWluamVjdG9yJztcbmltcG9ydCB7IFRvYXN0Q29udGFpbmVyRGlyZWN0aXZlIH0gZnJvbSAnLi90b2FzdC5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgR2xvYmFsQ29uZmlnLCBJbmRpdmlkdWFsQ29uZmlnLCBUb2FzdFBhY2thZ2UsIFRvYXN0VG9rZW4sIFRPQVNUX0NPTkZJRyB9IGZyb20gJy4vdG9hc3RyLWNvbmZpZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlVG9hc3Q8Qz4ge1xuICAvKiogWW91ciBUb2FzdCBJRC4gVXNlIHRoaXMgdG8gY2xvc2UgaXQgaW5kaXZpZHVhbGx5ICovXG4gIHRvYXN0SWQ6IG51bWJlcjtcbiAgLyoqIHRoZSBtZXNzYWdlIG9mIHlvdXIgdG9hc3QuIFN0b3JlZCB0byBwcmV2ZW50IGR1cGxpY2F0ZXMgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuICAvKiogYSByZWZlcmVuY2UgdG8gdGhlIGNvbXBvbmVudCBzZWUgcG9ydGFsLnRzICovXG4gIHBvcnRhbDogQ29tcG9uZW50UmVmPEM+O1xuICAvKiogYSByZWZlcmVuY2UgdG8geW91ciB0b2FzdCAqL1xuICB0b2FzdFJlZjogVG9hc3RSZWY8Qz47XG4gIC8qKiB0cmlnZ2VyZWQgd2hlbiB0b2FzdCBpcyBhY3RpdmUgKi9cbiAgb25TaG93bjogT2JzZXJ2YWJsZTxhbnk+O1xuICAvKiogdHJpZ2dlcmVkIHdoZW4gdG9hc3QgaXMgZGVzdHJveWVkICovXG4gIG9uSGlkZGVuOiBPYnNlcnZhYmxlPGFueT47XG4gIC8qKiB0cmlnZ2VyZWQgb24gdG9hc3QgY2xpY2sgKi9cbiAgb25UYXA6IE9ic2VydmFibGU8YW55PjtcbiAgLyoqIGF2YWlsYWJsZSBmb3IgeW91ciB1c2UgaW4gY3VzdG9tIHRvYXN0ICovXG4gIG9uQWN0aW9uOiBPYnNlcnZhYmxlPGFueT47XG59XG5cbkBJbmplY3RhYmxlKHsgcHJvdmlkZWRJbjogJ3Jvb3QnIH0pXG5leHBvcnQgY2xhc3MgVG9hc3RyU2VydmljZSB7XG4gIHRvYXN0ckNvbmZpZzogR2xvYmFsQ29uZmlnO1xuICBjdXJyZW50bHlBY3RpdmUgPSAwO1xuICB0b2FzdHM6IEFjdGl2ZVRvYXN0PGFueT5bXSA9IFtdO1xuICBvdmVybGF5Q29udGFpbmVyOiBUb2FzdENvbnRhaW5lckRpcmVjdGl2ZTtcbiAgcHJldmlvdXNUb2FzdE1lc3NhZ2U6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBpbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgQEluamVjdChUT0FTVF9DT05GSUcpIHRva2VuOiBUb2FzdFRva2VuLFxuICAgIHByaXZhdGUgb3ZlcmxheTogT3ZlcmxheSxcbiAgICBwcml2YXRlIF9pbmplY3RvcjogSW5qZWN0b3IsXG4gICAgcHJpdmF0ZSBzYW5pdGl6ZXI6IERvbVNhbml0aXplcixcbiAgICBwcml2YXRlIG5nWm9uZTogTmdab25lXG4gICkge1xuICAgIHRoaXMudG9hc3RyQ29uZmlnID0ge1xuICAgICAgLi4udG9rZW4uZGVmYXVsdCxcbiAgICAgIC4uLnRva2VuLmNvbmZpZyxcbiAgICB9O1xuICAgIGlmICh0b2tlbi5jb25maWcuaWNvbkNsYXNzZXMpIHtcbiAgICAgIHRoaXMudG9hc3RyQ29uZmlnLmljb25DbGFzc2VzID0ge1xuICAgICAgICAuLi50b2tlbi5kZWZhdWx0Lmljb25DbGFzc2VzLFxuICAgICAgICAuLi50b2tlbi5jb25maWcuaWNvbkNsYXNzZXMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICAvKiogc2hvdyB0b2FzdCAqL1xuICBzaG93KFxuICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgdGl0bGU/OiBzdHJpbmcsXG4gICAgb3ZlcnJpZGU6IFBhcnRpYWw8SW5kaXZpZHVhbENvbmZpZz4gPSB7fSxcbiAgICB0eXBlID0gJydcbiAgKSB7XG4gICAgcmV0dXJuIHRoaXMuX3ByZUJ1aWxkTm90aWZpY2F0aW9uKFxuICAgICAgdHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICB0aXRsZSxcbiAgICAgIHRoaXMuYXBwbHlDb25maWcob3ZlcnJpZGUpXG4gICAgKTtcbiAgfVxuICAvKiogc2hvdyBzdWNjZXNzZnVsIHRvYXN0ICovXG4gIHN1Y2Nlc3MoXG4gICAgbWVzc2FnZT86IHN0cmluZyxcbiAgICB0aXRsZT86IHN0cmluZyxcbiAgICBvdmVycmlkZTogUGFydGlhbDxJbmRpdmlkdWFsQ29uZmlnPiA9IHt9XG4gICkge1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRvYXN0ckNvbmZpZy5pY29uQ2xhc3Nlcy5zdWNjZXNzIHx8ICcnO1xuICAgIHJldHVybiB0aGlzLl9wcmVCdWlsZE5vdGlmaWNhdGlvbihcbiAgICAgIHR5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgdGl0bGUsXG4gICAgICB0aGlzLmFwcGx5Q29uZmlnKG92ZXJyaWRlKVxuICAgICk7XG4gIH1cbiAgLyoqIHNob3cgZXJyb3IgdG9hc3QgKi9cbiAgZXJyb3IoXG4gICAgbWVzc2FnZT86IHN0cmluZyxcbiAgICB0aXRsZT86IHN0cmluZyxcbiAgICBvdmVycmlkZTogUGFydGlhbDxJbmRpdmlkdWFsQ29uZmlnPiA9IHt9XG4gICkge1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRvYXN0ckNvbmZpZy5pY29uQ2xhc3Nlcy5lcnJvciB8fCAnJztcbiAgICByZXR1cm4gdGhpcy5fcHJlQnVpbGROb3RpZmljYXRpb24oXG4gICAgICB0eXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIHRpdGxlLFxuICAgICAgdGhpcy5hcHBseUNvbmZpZyhvdmVycmlkZSlcbiAgICApO1xuICB9XG4gIC8qKiBzaG93IGluZm8gdG9hc3QgKi9cbiAgaW5mbyhcbiAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgIHRpdGxlPzogc3RyaW5nLFxuICAgIG92ZXJyaWRlOiBQYXJ0aWFsPEluZGl2aWR1YWxDb25maWc+ID0ge31cbiAgKSB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMudG9hc3RyQ29uZmlnLmljb25DbGFzc2VzLmluZm8gfHwgJyc7XG4gICAgcmV0dXJuIHRoaXMuX3ByZUJ1aWxkTm90aWZpY2F0aW9uKFxuICAgICAgdHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICB0aXRsZSxcbiAgICAgIHRoaXMuYXBwbHlDb25maWcob3ZlcnJpZGUpXG4gICAgKTtcbiAgfVxuICAvKiogc2hvdyB3YXJuaW5nIHRvYXN0ICovXG4gIHdhcm5pbmcoXG4gICAgbWVzc2FnZT86IHN0cmluZyxcbiAgICB0aXRsZT86IHN0cmluZyxcbiAgICBvdmVycmlkZTogUGFydGlhbDxJbmRpdmlkdWFsQ29uZmlnPiA9IHt9XG4gICkge1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRvYXN0ckNvbmZpZy5pY29uQ2xhc3Nlcy53YXJuaW5nIHx8ICcnO1xuICAgIHJldHVybiB0aGlzLl9wcmVCdWlsZE5vdGlmaWNhdGlvbihcbiAgICAgIHR5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgdGl0bGUsXG4gICAgICB0aGlzLmFwcGx5Q29uZmlnKG92ZXJyaWRlKVxuICAgICk7XG4gIH1cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgb3IgYSBzaW5nbGUgdG9hc3QgYnkgaWRcbiAgICovXG4gIGNsZWFyKHRvYXN0SWQ/OiBudW1iZXIpIHtcbiAgICAvLyBDYWxsIGV2ZXJ5IHRvYXN0UmVmIG1hbnVhbENsb3NlIGZ1bmN0aW9uXG4gICAgZm9yIChjb25zdCB0b2FzdCBvZiB0aGlzLnRvYXN0cykge1xuICAgICAgaWYgKHRvYXN0SWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodG9hc3QudG9hc3RJZCA9PT0gdG9hc3RJZCkge1xuICAgICAgICAgIHRvYXN0LnRvYXN0UmVmLm1hbnVhbENsb3NlKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0b2FzdC50b2FzdFJlZi5tYW51YWxDbG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvKipcbiAgICogUmVtb3ZlIGFuZCBkZXN0cm95IGEgc2luZ2xlIHRvYXN0IGJ5IGlkXG4gICAqL1xuICByZW1vdmUodG9hc3RJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgZm91bmQgPSB0aGlzLl9maW5kVG9hc3QodG9hc3RJZCk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3VuZC5hY3RpdmVUb2FzdC50b2FzdFJlZi5jbG9zZSgpO1xuICAgIHRoaXMudG9hc3RzLnNwbGljZShmb3VuZC5pbmRleCwgMSk7XG4gICAgdGhpcy5jdXJyZW50bHlBY3RpdmUgPSB0aGlzLmN1cnJlbnRseUFjdGl2ZSAtIDE7XG4gICAgaWYgKCF0aGlzLnRvYXN0ckNvbmZpZy5tYXhPcGVuZWQgfHwgIXRoaXMudG9hc3RzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0aGlzLmN1cnJlbnRseUFjdGl2ZSA8IHRoaXMudG9hc3RyQ29uZmlnLm1heE9wZW5lZCAmJlxuICAgICAgdGhpcy50b2FzdHNbdGhpcy5jdXJyZW50bHlBY3RpdmVdXG4gICAgKSB7XG4gICAgICBjb25zdCBwID0gdGhpcy50b2FzdHNbdGhpcy5jdXJyZW50bHlBY3RpdmVdLnRvYXN0UmVmO1xuICAgICAgaWYgKCFwLmlzSW5hY3RpdmUoKSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRseUFjdGl2ZSA9IHRoaXMuY3VycmVudGx5QWN0aXZlICsgMTtcbiAgICAgICAgcC5hY3RpdmF0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIHRvYXN0IG1lc3NhZ2UgaXMgYWxyZWFkeSBzaG93blxuICAgKi9cbiAgZmluZER1cGxpY2F0ZShtZXNzYWdlOiBzdHJpbmcsIHJlc2V0T25EdXBsaWNhdGU6IGJvb2xlYW4sIGNvdW50RHVwbGljYXRlczogYm9vbGVhbikge1xuICAgIGZvciAoY29uc3QgdG9hc3Qgb2YgdGhpcy50b2FzdHMpIHtcbiAgICAgIGlmICh0b2FzdC5tZXNzYWdlID09PSBtZXNzYWdlKSB7XG4gICAgICAgIHRvYXN0LnRvYXN0UmVmLm9uRHVwbGljYXRlKHJlc2V0T25EdXBsaWNhdGUsIGNvdW50RHVwbGljYXRlcyk7XG4gICAgICAgIHJldHVybiB0b2FzdDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKiogY3JlYXRlIGEgY2xvbmUgb2YgZ2xvYmFsIGNvbmZpZyBhbmQgYXBwbHkgaW5kaXZpZHVhbCBzZXR0aW5ncyAqL1xuICBwcml2YXRlIGFwcGx5Q29uZmlnKG92ZXJyaWRlOiBQYXJ0aWFsPEluZGl2aWR1YWxDb25maWc+ID0ge30pOiBHbG9iYWxDb25maWcge1xuICAgIHJldHVybiB7IC4uLnRoaXMudG9hc3RyQ29uZmlnLCAuLi5vdmVycmlkZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdG9hc3Qgb2JqZWN0IGJ5IGlkXG4gICAqL1xuICBwcml2YXRlIF9maW5kVG9hc3QoXG4gICAgdG9hc3RJZDogbnVtYmVyXG4gICk6IHsgaW5kZXg6IG51bWJlcjsgYWN0aXZlVG9hc3Q6IEFjdGl2ZVRvYXN0PGFueT4gfSB8IG51bGwge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50b2FzdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLnRvYXN0c1tpXS50b2FzdElkID09PSB0b2FzdElkKSB7XG4gICAgICAgIHJldHVybiB7IGluZGV4OiBpLCBhY3RpdmVUb2FzdDogdGhpcy50b2FzdHNbaV0gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB0aGUgbmVlZCB0byBydW4gaW5zaWRlIGFuZ3VsYXIncyB6b25lIHRoZW4gYnVpbGRzIHRoZSB0b2FzdFxuICAgKi9cbiAgcHJpdmF0ZSBfcHJlQnVpbGROb3RpZmljYXRpb24oXG4gICAgdG9hc3RUeXBlOiBzdHJpbmcsXG4gICAgbWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHRpdGxlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgY29uZmlnOiBHbG9iYWxDb25maWdcbiAgKTogQWN0aXZlVG9hc3Q8YW55PiB8IG51bGwge1xuICAgIGlmIChjb25maWcub25BY3RpdmF0ZVRpY2spIHtcbiAgICAgIHJldHVybiB0aGlzLm5nWm9uZS5ydW4oKCkgPT5cbiAgICAgICAgdGhpcy5fYnVpbGROb3RpZmljYXRpb24odG9hc3RUeXBlLCBtZXNzYWdlLCB0aXRsZSwgY29uZmlnKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2J1aWxkTm90aWZpY2F0aW9uKHRvYXN0VHlwZSwgbWVzc2FnZSwgdGl0bGUsIGNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbmQgYXR0YWNoZXMgdG9hc3QgZGF0YSB0byBjb21wb25lbnRcbiAgICogcmV0dXJucyB0aGUgYWN0aXZlIHRvYXN0LCBvciBpbiBjYXNlIHByZXZlbnREdXBsaWNhdGVzIGlzIGVuYWJsZWQgdGhlIG9yaWdpbmFsL25vbi1kdXBsaWNhdGUgYWN0aXZlIHRvYXN0LlxuICAgKi9cbiAgcHJpdmF0ZSBfYnVpbGROb3RpZmljYXRpb24oXG4gICAgdG9hc3RUeXBlOiBzdHJpbmcsXG4gICAgbWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHRpdGxlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgY29uZmlnOiBHbG9iYWxDb25maWdcbiAgKTogQWN0aXZlVG9hc3Q8YW55PiB8IG51bGwge1xuICAgIGlmICghY29uZmlnLnRvYXN0Q29tcG9uZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RvYXN0Q29tcG9uZW50IHJlcXVpcmVkJyk7XG4gICAgfVxuICAgIC8vIG1heCBvcGVuZWQgYW5kIGF1dG8gZGlzbWlzcyA9IHRydWVcbiAgICAvLyBpZiB0aW1lb3V0ID0gMCByZXNldHRpbmcgaXQgd291bGQgcmVzdWx0IGluIHNldHRpbmcgdGhpcy5oaWRlVGltZSA9IERhdGUubm93KCkuIEhlbmNlLCB3ZSBvbmx5IHdhbnQgdG8gcmVzZXQgdGltZW91dCBpZiB0aGVyZSBpc1xuICAgIC8vIGEgdGltZW91dCBhdCBhbGxcbiAgICBjb25zdCBkdXBsaWNhdGUgPSB0aGlzLmZpbmREdXBsaWNhdGUoXG4gICAgICBtZXNzYWdlLFxuICAgICAgdGhpcy50b2FzdHJDb25maWcucmVzZXRUaW1lb3V0T25EdXBsaWNhdGUgJiYgY29uZmlnLnRpbWVPdXQgPiAwLFxuICAgICAgdGhpcy50b2FzdHJDb25maWcuY291bnREdXBsaWNhdGVzXG4gICAgKTtcbiAgICBpZiAobWVzc2FnZSAmJiB0aGlzLnRvYXN0ckNvbmZpZy5wcmV2ZW50RHVwbGljYXRlcyAmJiBkdXBsaWNhdGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBkdXBsaWNhdGU7XG4gICAgfVxuXG4gICAgdGhpcy5wcmV2aW91c1RvYXN0TWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgbGV0IGtlZXBJbmFjdGl2ZSA9IGZhbHNlO1xuICAgIGlmIChcbiAgICAgIHRoaXMudG9hc3RyQ29uZmlnLm1heE9wZW5lZCAmJlxuICAgICAgdGhpcy5jdXJyZW50bHlBY3RpdmUgPj0gdGhpcy50b2FzdHJDb25maWcubWF4T3BlbmVkXG4gICAgKSB7XG4gICAgICBrZWVwSW5hY3RpdmUgPSB0cnVlO1xuICAgICAgaWYgKHRoaXMudG9hc3RyQ29uZmlnLmF1dG9EaXNtaXNzKSB7XG4gICAgICAgIHRoaXMuY2xlYXIodGhpcy50b2FzdHNbMF0udG9hc3RJZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgb3ZlcmxheVJlZiA9IHRoaXMub3ZlcmxheS5jcmVhdGUoXG4gICAgICBjb25maWcucG9zaXRpb25DbGFzcyxcbiAgICAgIHRoaXMub3ZlcmxheUNvbnRhaW5lclxuICAgICk7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuaW5kZXggKyAxO1xuICAgIGxldCBzYW5pdGl6ZWRNZXNzYWdlOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsID0gbWVzc2FnZTtcbiAgICBpZiAobWVzc2FnZSAmJiBjb25maWcuZW5hYmxlSHRtbCkge1xuICAgICAgc2FuaXRpemVkTWVzc2FnZSA9IHRoaXMuc2FuaXRpemVyLnNhbml0aXplKFNlY3VyaXR5Q29udGV4dC5IVE1MLCBtZXNzYWdlKTtcbiAgICB9XG5cbiAgICBjb25zdCB0b2FzdFJlZiA9IG5ldyBUb2FzdFJlZihvdmVybGF5UmVmKTtcbiAgICBjb25zdCB0b2FzdFBhY2thZ2UgPSBuZXcgVG9hc3RQYWNrYWdlKFxuICAgICAgdGhpcy5pbmRleCxcbiAgICAgIGNvbmZpZyxcbiAgICAgIHNhbml0aXplZE1lc3NhZ2UsXG4gICAgICB0aXRsZSxcbiAgICAgIHRvYXN0VHlwZSxcbiAgICAgIHRvYXN0UmVmXG4gICAgKTtcbiAgICBjb25zdCB0b2FzdEluamVjdG9yID0gbmV3IFRvYXN0SW5qZWN0b3IodG9hc3RQYWNrYWdlLCB0aGlzLl9pbmplY3Rvcik7XG4gICAgY29uc3QgY29tcG9uZW50ID0gbmV3IENvbXBvbmVudFBvcnRhbChjb25maWcudG9hc3RDb21wb25lbnQsIHRvYXN0SW5qZWN0b3IpO1xuICAgIGNvbnN0IHBvcnRhbCA9IG92ZXJsYXlSZWYuYXR0YWNoKGNvbXBvbmVudCwgdGhpcy50b2FzdHJDb25maWcubmV3ZXN0T25Ub3ApO1xuICAgIHRvYXN0UmVmLmNvbXBvbmVudEluc3RhbmNlID0gKHBvcnRhbCBhcyBhbnkpLl9jb21wb25lbnQ7XG4gICAgY29uc3QgaW5zOiBBY3RpdmVUb2FzdDxhbnk+ID0ge1xuICAgICAgdG9hc3RJZDogdGhpcy5pbmRleCxcbiAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UgfHwgJycsXG4gICAgICB0b2FzdFJlZixcbiAgICAgIG9uU2hvd246IHRvYXN0UmVmLmFmdGVyQWN0aXZhdGUoKSxcbiAgICAgIG9uSGlkZGVuOiB0b2FzdFJlZi5hZnRlckNsb3NlZCgpLFxuICAgICAgb25UYXA6IHRvYXN0UGFja2FnZS5vblRhcCgpLFxuICAgICAgb25BY3Rpb246IHRvYXN0UGFja2FnZS5vbkFjdGlvbigpLFxuICAgICAgcG9ydGFsXG4gICAgfTtcblxuICAgIGlmICgha2VlcEluYWN0aXZlKSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaW5zLnRvYXN0UmVmLmFjdGl2YXRlKCk7XG4gICAgICAgIHRoaXMuY3VycmVudGx5QWN0aXZlID0gdGhpcy5jdXJyZW50bHlBY3RpdmUgKyAxO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy50b2FzdHMucHVzaChpbnMpO1xuICAgIHJldHVybiBpbnM7XG4gIH1cbn1cbiJdfQ==