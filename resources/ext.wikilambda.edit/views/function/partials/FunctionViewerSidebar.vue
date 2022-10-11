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
					v-if="item.language !== zLang"
					class="ext-wikilambda-function-viewer-sidebar__chip-container"
					@mouseover="hoveringIndex = index"
					@mouseleave="hoveringIndex = -1"
					@touchstart="hoveringIndex = ( hoveringIndex === index ? -1 : index )"
				>
					<chip
						class="ext-wikilambda-function-viewer-sidebar__chip-item"
						:index="index"
						:editable-container="false"
						:readonly="true"
						:text="item.isoCode.toUpperCase()"
						:hover-text="item.languageLabel"
					></chip>
				</div>
				{{ item.label }}
				<div
					v-if="hoveringIndex === index && item.language !== zLang"
					class="ext-wikilambda-function-viewer-sidebar__chip-hover"
				>
					<span
						class="ext-wikilambda-function-viewer-sidebar__chip-hover-text"
					>
						{{ item.languageLabel }}
					</span>
				</div>
			</li>
		</ul>
		<cdx-button
			v-if="shouldShowButton"
			class="ext-wikilambda-function-viewer-sidebar__button"
			:type="buttonType"
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
var Chip = require( '../../../components/base/Chip.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon;

// @vue/component
module.exports = exports = {
	name: 'sidebar-list-container',
	components: {
		chip: Chip,
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
		buttonType: {
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
		},
		zLang: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			hoveringIndex: -1
		};
	},
	methods: {
		changeShowLangs: function () {
			this.$emit( 'changeShowLangs' );
		}
	}
};

</script>

<style lang="less">
@import '../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-viewer-sidebar {
	ul {
		list-style: none;
		margin-left: 0;
	}

	&__chip {
		margin-bottom: 15px;

		&-container {
			display: inline-block;
		}

		&-item {
			margin-right: 8px;
			display: inline-block;
		}

		&-hover {
			margin-top: 15px;
			margin-bottom: 15px;
		}

		&-hover-text {
			background-color: @wmui-color-base70;
			padding: 5px;
			box-shadow: 0 4px 4px rgba( 0, 0, 0, 0.25 );
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
