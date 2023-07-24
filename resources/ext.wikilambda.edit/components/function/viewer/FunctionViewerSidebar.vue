<!--
	WikiLambda Vue component for the sidebar in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-function-viewer-sidebar"
	>
		<ul
			v-for="( item, index ) in list"
			:key="index"
			class="ext-wikilambda-function-viewer-sidebar__chip"
		>
			<li>
				<div
					class="ext-wikilambda-function-viewer-sidebar__chip-container"
				>
					<cdx-info-chip
						class="ext-wikilambda-function-viewer-sidebar__chip-item"
						:title="item.languageLabel"
					>
						{{ item.isoCode.toUpperCase() }}
					</cdx-info-chip>
					{{ item.label }}
				</div>
			</li>
		</ul>
		<cdx-button
			v-if="shouldShowButton"
			class="ext-wikilambda-function-viewer-sidebar__button"
			:weight="buttonWeight"
			@click="changeShowLangs"
		>
			<cdx-icon
				class="ext-wikilambda-function-viewer-sidebar__button-icon"
				:icon="buttonIcon">
			</cdx-icon>
			{{ buttonText }}
		</cdx-button>
	</div>
</template>

<script>
var CdxInfoChip = require( '@wikimedia/codex' ).CdxInfoChip,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon;

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-sidebar',
	components: {
		'cdx-info-chip': CdxInfoChip,
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton
	},
	props: {
		list: {
			type: Array,
			required: true
		},
		buttonText: {
			type: String,
			required: true
		},
		buttonWeight: {
			type: String,
			required: true
		},
		buttonIcon: {
			type: String,
			required: true
		},
		shouldShowButton: {
			type: Boolean,
			required: false,
			// eslint-disable-next-line
			default: true
		}
	},
	methods: {
		changeShowLangs: function () {
			this.$emit( 'changeShowLangs' );
		}
	}
};

</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-viewer-sidebar {
	ul {
		list-style: none;
		margin-left: 0;
	}

	&__chip {
		margin-bottom: @spacing-100;

		&-container {
			display: inline-block;
		}

		&-item {
			margin-right: @spacing-50;
			display: inline-block;
		}
	}

	&__button {
		display: flex;
		align-items: center;
		gap: 10px;

		&-icon {
			width: 12px;
			height: 7px;
		}
	}
}
</style>
