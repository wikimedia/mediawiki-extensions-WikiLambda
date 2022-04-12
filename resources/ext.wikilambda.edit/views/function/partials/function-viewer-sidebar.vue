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
				<template v-if="item.language !== zLang">
					<chip
						class="ext-wikilambda-function-viewer-sidebar__chip-item"
						:index="index"
						:editable-container="false"
						:readonly="true"
						:text="item.languageLabel"
					></chip>
				</template>
				{{ item.label }}
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
			type: Object,
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
	methods: {
		changeShowLangs: function () {
			this.$emit( 'changeShowLangs' );
		}
	}
};

</script>

<style lang="less">
.ext-wikilambda-function-viewer-sidebar {
	ul {
		list-style: none;
		margin-left: 0;
	}

	&__chip {
		margin-bottom: 15px;

		&-item {
			margin-right: 8px;
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
