<template>
	<button
		class="ext-wikilambda-tab"
		:class="statusClass"
		:disabled="disabled"
		@click="$emit('click')"
	>
		<sd-icon v-if="icon" :icon="icon"></sd-icon>
		{{ title }}
	</button>
</template>

<script>
var SdIcon = require( './Icon.vue' );

module.exports = {
	name: 'Tab',

	components: {
		'sd-icon': SdIcon
	},
	computed: {
		statusClass: function () {
			return 'ext-wikilambda-tab-status_' + this.status;
		}
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
	}

	// in case an unexpected status is passed
	&_undefined {
		color: @inactive-color;
		border-color: @inactive-color;
	}
}

</style>
