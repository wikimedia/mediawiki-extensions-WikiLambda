<template>
	<div class="ext-wikilambda-chip">
		<div
			class="ext-wikilambda-chip_text"
			:class="hover"
			role="textbox"
			:contenteditable="readonly"
			@keydown.enter="handleEnter($event)"
		>
			{{ text }}
		</div>
		<div
			class="ext-wikilambda-chip_icon"
			@click="handleRemove"
		>
			<sd-icon
				:icon="icon"
				:width="iconWidth"
				:height="iconHeight"
			></sd-icon>
		</div>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' ),
	icons = require( '../../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'Chip',
	components: {
		'sd-icon': SdIcon
	},
	props: {
		text: {
			type: String,
			required: true
		},
		index: {
			type: Number,
			required: true
		},
		readonly: { // if chip can be edited
			type: Boolean,
			required: false
		},
		iconWidth: {
			type: String,
			default: '1em'
		},
		iconHeight: {
			type: String,
			default: '1em'
		}
	},
	data: function () {
		return {
			icon: icons.sdIconClose,
			contentEditable: false,
			hover: 'ext-wikilambda-chip_input'
		};
	},
	methods: {
		handleEnter: function ( event ) {
			event.target.blur();
			var newValue = event.target.innerText;
			if ( newValue !== this.text ) {
				this.$emit( 'edit-chip', this.index, newValue );
			}
		},
		handleRemove: function () {
			this.$emit( 'remove-chip', this.index );
		}
	}
};

</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-chip {
	display: inline-flex;
	background-color: @wmui-color-base90;
	border-width: 1.5px;
	border-style: solid;
	border-radius: 5px;
	height: fit-content;
	padding: 4px 6px;
	margin: 2.5px;
	vertical-align: middle;

	&_text {
		width: max-content;
	}

	&_icon {
		margin-left: 10px;
	}
}

</style>
