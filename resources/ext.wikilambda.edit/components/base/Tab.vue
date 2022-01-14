<template>
	<!--
		WikiLambda Vue component for a navigation tab

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<button
			class="ext-wikilambda-tab"
			:class="statusClass"
			:disabled="disabled"
			@click="$emit( 'click' )"
		>
			<sd-icon v-if="icon && !tooltipVisible" :icon="icon"></sd-icon>
			<tooltip
				v-if="tooltipVisible"
				class="ext-wikilambda-tab_tooltip-container"
				:icon="tooltipIcon"
				:content="tooltipContent"
				:header="tooltipHeader"
			></tooltip>
			{{ title }}
		</button>
	</div>
</template>

<script>
var SdIcon = require( './Icon.vue' ),
	Tooltip = require( './Tooltip.vue' );

// @vue/component
module.exports = {
	name: 'Tab',
	components: {
		'sd-icon': SdIcon,
		// TOOD (T298040): replace with codex tooltip/popover component
		tooltip: Tooltip
	},
	props: {
		status: {
			type: String
		},
		title: {
			type: String
		},
		disabled: {
			type: Boolean,
			default: false,
			required: false
		},
		// Icon path or object. See Icon.vue for valid icon formats.
		icon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		// tooltip properties
		tooltipContent: {
			type: String
		},
		tooltipHeader: {
			type: String
		},
		tooltipIcon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		tooltipVisible: {
			type: Boolean
		}
	},
	computed: {
		statusClass: function () {
			// disabled styles trump inactive styles
			if ( this.disabled ) {
				return 'ext-wikilambda-tab-status_disabled';
			}
			return 'ext-wikilambda-tab-status_' + this.status;
		}
	}
};
</script>

<style lang="less">

.ext-wikilambda-tab {
	font-size: 14;
	font-style: normal;
	font-weight: bold;
	line-height: normal;
	text-align: left;
	background: none;
	border-left: 0;
	border-right: 0;
	border-top: 0;

	&_tooltip-container {
		color: @inactive-color;
		border-color: @inactive-color;
	}
}

@active-color:#3366CC;
@inactive-color: #000000;
@disabled-color: #A2A9B1;

.ext-wikilambda-tab-status {
	// the current tab
	&_active {
		color: @active-color;
		border-color: @active-color;
	}

	// not current, but clickable
	&_inactive {
		color: @inactive-color;
		border-color: @inactive-color;
	}

	// not clickable
	&_disabled {
		color: @disabled-color;
		border-color: @disabled-color;
		display: flex;
	}

	// in case an unexpected status is passed
	&_undefined {
		color: @inactive-color;
		border-color: @inactive-color;
	}
}

</style>
