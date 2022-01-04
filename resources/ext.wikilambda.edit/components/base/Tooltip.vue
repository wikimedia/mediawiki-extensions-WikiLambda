<template>
	<div>
		<button
			class="ext-wikilambda-tooltip_button"
			@click="toggleVisibility"
		>
			<sd-icon
				v-if="icon"
				:icon="icon"
				:style="'color: ' + iconColor"
			>
			</sd-icon>
		</button>
		<div v-if="isVisible" class="ext-wikilambda-tooltip_content">
			<div v-if="header" class="ext-wikilambda-tooltip_content_header">
				{{ header }}
			</div>
			<div>
				{{ content }}
			</div>
			<div v-if="footer">
				{{ footer }}
			</div>
		</div>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' );
module.exports = {
	name: 'Tooltip',
	components: {
		'sd-icon': SdIcon
	},
	data: function () {
		return {
			isVisible: false
		};
	},
	methods: {
		toggleVisibility: function () {
			this.isVisible = !this.isVisible;
		}
	},
	// TODO (T298491): add prop for interaction type (hover vs. click)
	props: {
		// Icon path or object. See Icon.vue for valid icon formats.
		icon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		iconColor: {
			type: String,
			default: '#A2A9B1'
		},
		header: {
			type: String,
			required: false
		},
		content: {
			type: String,
			required: true,
			default: ''
		},
		// not required for this usage, but other props of interest
		footer: {
			type: String,
			required: false
		},
		align: {
			type: String
		},
		// in this case you aren't relying on the tab label and/or icon
		label: {
			type: String,
			required: false
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tooltip {
	&_button {
		background: none;
		border: 0;
	}

	&_content {
		position: absolute;
		width: 200px;
		padding: 10px;
		margin-top: 15px;
		text-align: left;
		background: @wmui-color-base100;
		box-shadow: 1px 1px @wmui-color-base50;
		border: solid 1px @wmui-color-base50;
		font-weight: normal;

		&_header {
			font-weight: bold;
			margin-bottom: 5%;
		}
	}

	&_content:after,
	&_content:before {
		bottom: 100%;
		left: 10%;
		border: solid transparent;
		content: '';
		height: 0;
		width: 0;
		position: absolute;
		pointer-events: none;
	}

	&_content:after {
		border-color: rgba( 255, 255, 255, 0 );
		border-bottom-color: @wmui-color-base100;
		border-width: 10px;
		margin-left: -10px;
	}

	&_content:before {
		border-color: rgba( 255, 255, 255, 0 );
		border-bottom-color: @wmui-color-base50;
		border-width: 11px;
		margin-left: -11px;
	}
}

</style>
