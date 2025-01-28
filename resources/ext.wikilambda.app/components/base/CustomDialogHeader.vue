<!--
	WikiLambda Vue component for a Custom Dialog Header.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="cdx-dialog__header--default ext-wikilambda-app-custom-dialog-header" data-testid="custom-dialog-header">
		<div class="cdx-dialog__header__title-group ext-wikilambda-app-custom-dialog-header__title-group">
			<h2 class="cdx-dialog__header__title">
				<slot name="title"></slot>
			</h2>
			<p v-if="$slots.subtitle" class="cdx-dialog__header__subtitle">
				<slot name="subtitle"></slot>
			</p>
		</div>
		<div
			class="ext-wikilambda-app-custom-dialog-header__extra"
			:class="{ 'ext-wikilambda-app-custom-dialog-header__extra--has-content': $slots.extra }">
			<slot v-if="$slots.extra" name="extra"></slot>
			<cdx-button
				weight="quiet"
				class="cdx-dialog__header__close-button"
				:aria-label="$i18n( 'wikilambda-dialog-close' ).text()"
				@click="$emit( 'close-dialog' )"
			>
				<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { CdxButton, CdxIcon } = require( '../../../codex.js' );
const icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-custom-dialog-header',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	data: function () {
		return {
			icons
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-custom-dialog-header.cdx-dialog__header--default {
	align-items: flex-start;
	gap: @spacing-100;

	.ext-wikilambda-app-custom-dialog-header__title-group.cdx-dialog__header__title-group {
		margin-top: @spacing-12;
	}

	.ext-wikilambda-app-custom-dialog-header__extra {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: @spacing-25;

		&--has-content {
			margin-top: -@spacing-25;
		}
	}
}
</style>
