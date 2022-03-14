<template>
	<!--
		WikiLambda Vue component for a "Chip" / input tag

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-chip">
		<div
			class="ext-wikilambda-chip_text"
			:class="hover"
			role="textbox"
			:contenteditable="readonly"
			@keydown.enter="handleEnter( $event )"
		>
			{{ text }}
		</div>
		<div
			class="ext-wikilambda-chip_icon"
			@click="handleRemove"
		>
			<cdx-icon
				:icon="icon"
				:width="iconWidth"
				:height="iconHeight"
			></cdx-icon>
		</div>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'chip-item',
	components: {
		'cdx-icon': CdxIcon
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
			icon: icons.cdxIconClose,
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
